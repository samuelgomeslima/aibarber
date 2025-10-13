import {
  BARBERS,
  BARBER_MAP,
  openingHour,
  closingHour,
  minutesToTime,
  timeToMinutes,
  addMinutes,
  overlap,
  pad,
  type Service,
} from "./domain";
import {
  getBookings,
  createBooking,
  cancelBooking,
  findCustomerByPhone,
  createCustomer as insertCustomer,
  getCustomerById,
  type BookingWithCustomer,
} from "./bookings";
import { callOpenAIChatCompletion, isOpenAiConfigured, type ChatMessage } from "./openai";

export type ConversationMessage = {
  role: "assistant" | "user";
  content: string;
};

export type AgentRunOptions = {
  systemPrompt: string;
  contextSummary: string;
  conversation: ConversationMessage[];
  onBookingsMutated?: () => Promise<void> | void;
  services: Service[];
};

function buildToolDefinitions(services: Service[]) {
  const serviceIds = services.map((s) => s.id);
  const serviceIdProperty =
    serviceIds.length > 0
      ? {
          type: "string" as const,
          enum: serviceIds,
          description: "ID of the requested service",
        }
      : {
          type: "string" as const,
          description: "ID of the requested service",
        };

  return [
    {
      type: "function" as const,
      function: {
        name: "list_bookings",
        description:
          "Return the existing bookings. If a date is provided, only return bookings for that day. Always include the booking id, service id, barber id, and timeslot.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date in YYYY-MM-DD format",
            },
          },
          required: ["date"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "get_availability",
        description:
          "Return available start times for a specific date, service, and barber. Only include options that do not conflict with existing bookings and stay inside opening hours.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Date in YYYY-MM-DD format" },
            service_id: serviceIdProperty,
            barber_id: {
              type: "string",
              enum: BARBERS.map((b) => b.id),
              description: "ID of the requested barber",
            },
          },
          required: ["date", "service_id", "barber_id"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "book_service",
        description:
          "Create a booking for the user. Confirm there are no conflicts before creating the booking.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Date in YYYY-MM-DD format" },
            start: { type: "string", description: "Start time in HH:MM format" },
            service_id: serviceIdProperty,
            barber_id: {
              type: "string",
              enum: BARBERS.map((b) => b.id),
              description: "ID of the barber to book",
            },
            customer_id: {
              type: "string",
              description: "ID of the customer making the booking",
            },
            customer_name: {
              type: "string",
              description: "Optional name of the customer for reference",
            },
          },
          required: ["date", "start", "service_id", "barber_id", "customer_id"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "cancel_booking",
        description:
          "Cancel an existing booking. The booking can be referenced by its id or by date/start/barber combination.",
        parameters: {
          type: "object",
          properties: {
            booking_id: { type: "string", description: "Existing booking id" },
            date: { type: "string", description: "Date in YYYY-MM-DD format" },
            start: { type: "string", description: "Start time in HH:MM format" },
            barber_id: {
              type: "string",
              enum: BARBERS.map((b) => b.id),
              description: "ID of the barber handling the booking",
            },
          },
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "find_customer",
        description:
          "Check if a customer is already registered by phone number. Provide digits only; do not include formatting characters.",
        parameters: {
          type: "object",
          properties: {
            phone: { type: "string", description: "Phone number digits" },
          },
          required: ["phone"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "create_customer",
        description:
          "Register a new customer when they are not found. Always include the first name, last name, and phone digits.",
        parameters: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            phone: { type: "string", description: "Phone number digits" },
          },
          required: ["first_name", "last_name", "phone"],
        },
      },
    },
  ];
}

async function listBookings(args: { date?: string }, serviceMap: Map<string, Service>): Promise<unknown> {
  if (!args?.date) {
    return { error: "date is required" };
  }
  const rows = await getBookings(args.date);
  return rows.map((b) => serializeBooking(b, serviceMap));
}

function serializeBooking(b: BookingWithCustomer, serviceMap: Map<string, Service>) {
  return {
    id: b.id,
    date: b.date,
    start: b.start,
    end: b.end,
    service_id: b.service_id,
    barber_id: b.barber,
    customer_id: b.customer_id ?? null,
    service_name: serviceMap.get(b.service_id)?.name ?? b.service_id,
    barber_name: BARBER_MAP[b.barber as keyof typeof BARBER_MAP]?.name ?? b.barber,
    customer_name: b._customer
      ? `${b._customer.first_name}${b._customer.last_name ? ` ${b._customer.last_name}` : ""}`
      : null,
  };
}

async function getAvailability(
  args: {
  date: string;
  service_id: string;
  barber_id: string;
  },
  services: Map<string, Service>,
) {
  if (!args?.date || !args?.service_id || !args?.barber_id) {
    return { error: "Missing date, service_id, or barber_id" };
  }
  const service = services.get(args.service_id);
  if (!service) return { error: `Unknown service ${args.service_id}` };

  const startMinutes = openingHour * 60;
  const endMinutes = closingHour * 60;
  const dayBookings = await getBookings(args.date);
  const relevant = dayBookings.filter((b) => b.barber === args.barber_id);

  const slots: { start: string; end: string }[] = [];
  for (let t = startMinutes; t <= endMinutes - service.estimated_minutes; t += 30) {
    const start = minutesToTime(t);
    const end = addMinutes(start, service.estimated_minutes);
    if (timeToMinutes(end) > endMinutes) continue;
    const hasConflict = relevant.some((b) => overlap(start, end, b.start, b.end));
    if (!hasConflict) slots.push({ start, end });
  }
  return {
    service_id: service.id,
    barber_id: args.barber_id,
    date: args.date,
    slots,
  };
}

async function bookService(
  args: {
    date: string;
    start: string;
    service_id: string;
    barber_id: string;
    customer_id: string;
    customer_name?: string;
  },
  services: Map<string, Service>,
  onMutated?: () => Promise<void> | void,
) {
  const { date, start, service_id, barber_id, customer_id } = args || {};
  if (!date || !start || !service_id || !barber_id || !customer_id) {
    return { error: "Missing date, start, service_id, barber_id, or customer_id" };
  }
  const service = services.get(service_id);
  if (!service) return { error: `Unknown service ${service_id}` };

  const customer = await getCustomerById(customer_id);
  if (!customer) {
    return { error: `Customer ${customer_id} not found` };
  }

  const startMinutes = timeToMinutes(start);
  if (startMinutes < openingHour * 60) return { error: "Start time is before opening hours" };
  const end = addMinutes(start, service.estimated_minutes);
  if (timeToMinutes(end) > closingHour * 60) return { error: "Selected time exceeds closing hours" };

  const dayBookings = await getBookings(date);
  const conflict = dayBookings.find((b) => b.barber === barber_id && overlap(start, end, b.start, b.end));
  if (conflict) {
    return {
      error: "conflict",
      conflicting_booking: serializeBooking(conflict, services),
    };
  }

  const bookingId = await createBooking({
    date,
    start,
    end,
    service_id: service.id,
    barber: barber_id,
    customer_id,
  });

  await onMutated?.();

  return {
    success: true,
    booking: {
      id: bookingId,
      date,
      start,
      end,
      service_id: service.id,
      barber_id,
    },
  };
}

async function findCustomer(args: { phone: string }) {
  const digits = (args?.phone ?? "").replace(/\D/g, "");
  if (!digits) {
    return { error: "Phone is required" };
  }
  const customer = await findCustomerByPhone(digits);
  if (!customer) return { customer: null };
  return {
    customer: {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
    },
  };
}

async function createCustomer(args: { first_name: string; last_name: string; phone: string }) {
  const first = args?.first_name?.trim();
  const last = args?.last_name?.trim();
  const digits = (args?.phone ?? "").replace(/\D/g, "");
  if (!first || !last || !digits) {
    return { error: "first_name, last_name, and phone are required" };
  }

  const existing = await findCustomerByPhone(digits);
  if (existing) {
    return {
      customer: {
        id: existing.id,
        first_name: existing.first_name,
        last_name: existing.last_name,
        phone: existing.phone,
      },
      already_exists: true,
    };
  }

  const created = await insertCustomer({ first_name: first, last_name: last, phone: digits });
  return {
    customer: {
      id: created.id,
      first_name: created.first_name,
      last_name: created.last_name,
      phone: created.phone,
    },
    already_exists: false,
  };
}

async function cancelService(
  args: { booking_id?: string; date?: string; start?: string; barber_id?: string },
  onMutated?: () => Promise<void> | void,
) {
  const { booking_id, date, start, barber_id } = args || {};
  let id = booking_id;

  if (!id) {
    if (!date || !start || !barber_id) {
      return { error: "Provide booking_id or date/start/barber_id" };
    }
    const rows = await getBookings(date);
    const found = rows.find((b) => b.barber === barber_id && b.start === start);
    if (!found) {
      return { error: "Booking not found" };
    }
    id = found.id;
  }

  await cancelBooking(id);
  await onMutated?.();

  return { success: true, canceled_id: id };
}

export async function runBookingAgent(options: AgentRunOptions): Promise<string> {
  if (!isOpenAiConfigured) {
    throw new Error("The chat assistant API is not configured on the server.");
  }

  const { systemPrompt, contextSummary, conversation, onBookingsMutated, services } = options;
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const toolDefinitions = buildToolDefinitions(services);

  const today = new Date();
  const currentDate = today.toISOString().split("T")[0];
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        systemPrompt,
        "You have tool access to manage the booking agenda.",
        "Use the provided functions to check availability before confirming a booking.",
        `Today's date: ${currentDate}.`,
        `Opening hours: ${pad(openingHour)}:00-${pad(closingHour)}:00.`,
        "Context summary:",
        contextSummary,
      ].join("\n"),
    },
    ...conversation.map((m) => ({ role: m.role, content: m.content })),
  ];

  const toolHandlers: Record<string, (args: any) => Promise<unknown>> = {
    list_bookings: (args: any) => listBookings(args, serviceMap),
    get_availability: (args: any) => getAvailability(args, serviceMap),
    book_service: (args: any) => bookService(args, serviceMap, onBookingsMutated),
    cancel_booking: (args: any) => cancelService(args, onBookingsMutated),
    find_customer: (args: any) => findCustomer(args),
    create_customer: (args: any) => createCustomer(args),
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await callOpenAIChatCompletion({
      messages,
      tools: toolDefinitions,
      model: "gpt-4o-mini",
      temperature: 0,
    });

    const choice = response?.choices?.[0];
    if (!choice) throw new Error("OpenAI agent returned no choices.");
    const message = choice.message;
    if (!message) throw new Error("OpenAI agent returned no message.");

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });

      for (const call of message.tool_calls) {
        const handler = toolHandlers[call.function.name];
        if (!handler) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: `Unknown tool: ${call.function.name}` }),
          });
          continue;
        }
        let args: any;
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch (err) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: "Invalid JSON arguments", raw: call.function.arguments }),
          });
          continue;
        }
        try {
          const result = await handler(args);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result ?? null),
          });
        } catch (err: any) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: err?.message ?? String(err) }),
          });
        }
      }
      continue;
    }

    const content = normalizeContent(message.content);
    if (!content) {
      throw new Error("Agent did not return a textual response.");
    }
    return content;
  }

  throw new Error("Agent stopped without a final response.");
}

function normalizeContent(input: any): string | null {
  if (input == null) return null;
  if (typeof input === "string") return input.trim() || null;
  if (Array.isArray(input)) {
    const text = input
      .map((part) => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part === "object" && "text" in part) {
          return String((part as any).text ?? "");
        }
        return "";
      })
      .join("");
    return text.trim() || null;
  }
  return null;
}
