import type { SupportedLanguage } from "../../locales/language";
import type { ThemePreference } from "../../theme/preferences";
import { COMPONENT_COPY } from "../../locales/componentCopy";

export const LANGUAGE_COPY = {
  en: {
    languageLabel: "Language",
    switchLanguage: "Switch language to",
    navigation: {
      overview: "Overview",
      bookings: "Bookings",
      services: "Services",
      packages: "Packages",
      products: "Products",
      cashRegister: "Cash register",
      assistant: "Assistant",
      support: "Support",
      team: "Team members",
      settings: "Settings",
      logout: "Sign out",
      logoutAccessibility: "Sign out of AIBarber",
      logoutErrorTitle: "Sign out failed",
      logoutErrorMessage: "Unable to sign out. Please try again.",
    },
    loading: {
      title: "Loading your workspace",
      subtitle: "Hold on while we apply your preferences.",
    },
    settingsPage: {
      title: "Settings",
      subtitle: "Manage your preferences for the AIBarber dashboard.",
      themeLabel: "Appearance",
      themeDescription: "Choose how the dashboard adapts its colors.",
      themeOptions: {
        system: "System",
        light: "Light",
        dark: "Dark",
      },
      emailConfirmation: {
        title: "Confirm your email",
        description: (email: string) =>
          email
            ? `We haven't confirmed ${email} yet. Resend the confirmation email to finish setting up your workspace.`
            : "We haven't confirmed your email yet. Resend the confirmation email to finish setting up your workspace.",
        action: "Resend confirmation email",
        sending: "Sending...",
        success: "We sent a new confirmation email. Check your inbox.",
        error: "We couldn't resend the confirmation email. Try again in a moment.",
      },
      apiStatus: {
        title: "AI services",
        description: "Verify the availability of chat and transcription integrations.",
        refresh: "Check again",
        refreshing: "Checking…",
        loading: "Checking services…",
        error: "Unable to verify the services.",
        labels: {
          chat: "Chat assistant",
          transcribe: "Voice transcription",
        },
        states: {
          available: "Available",
          unavailable: "Unavailable",
          unauthorized: "Unauthorized",
        },
      },
      barbershop: {
        title: "Barbershop profile",
        description: "Update your workspace name, public slug, and timezone.",
        cta: "Edit barbershop data",
        ctaAccessibility: "Open barbershop profile settings",
      },
      services: {
        title: "Services",
        description: "Create, edit, and archive the services available for booking.",
        cta: "Manage services",
        ctaAccessibility: "Open services management",
      },
      packages: {
        title: "Packages",
        description: "Bundle services together and adjust their pricing.",
        cta: "Manage packages",
        ctaAccessibility: "Open service packages management",
      },
      team: {
        title: "Team members",
        description: "Invite and update the professionals who can access your workspace.",
        cta: "Manage team",
        ctaAccessibility: "Open team management",
      },
    },
    teamPage: {
      title: "Team members",
      subtitle: "Register administrators, managers, and professionals who can access the workspace.",
      refresh: "Refresh list",
      listTitle: "Current team",
      empty: "No team members registered yet.",
      alerts: {
        loadTitle: "Team members",
      },
      roles: [
        {
          value: "administrator",
          label: "Administrator",
          description: "Full access to schedules, inventory, and settings.",
        },
        {
          value: "manager",
          label: "Manager",
          description: "Manages appointments, services, and daily operations.",
        },
        {
          value: "professional",
          label: "Professional",
          description: "Sees their agenda and updates booking status.",
        },
        {
          value: "assistant",
          label: "Assistant",
          description: "Helps with bookings and customer records.",
        },
      ],
      userForm: {
        ...COMPONENT_COPY.en.userForm,
        title: "Register team member",
        buttons: {
          ...COMPONENT_COPY.en.userForm.buttons,
          submit: "Save team member",
          submitAccessibility: "Save team member",
        },
        alerts: {
          ...COMPONENT_COPY.en.userForm.alerts,
          savedTitle: "Team member saved",
          failedFallback: "Unable to save the team member.",
        },
      },
    },
    barbershopPage: {
      title: "Barbershop profile",
      subtitle: "Update the details shared with staff and clients.",
      empty: "No barbershop information is available yet.",
      fields: {
        nameLabel: "Barbershop name",
        namePlaceholder: "AIBarber Studio",
        slugLabel: "Public slug (optional)",
        slugPlaceholder: "aibarber-studio",
        slugHelper: "Use lowercase letters, numbers, and hyphens.",
        timezoneLabel: "Timezone",
        timezonePlaceholder: "America/Sao_Paulo",
        timezoneHelper: "Used for booking availability and reminders.",
      },
      actions: {
        save: "Save changes",
        saving: "Saving…",
        retry: "Try again",
      },
      feedback: {
        saved: "Barbershop details updated.",
      },
      errors: {
        loadFailed: "Unable to load barbershop data.",
        saveFailed: "Unable to save barbershop data.",
        notConfigured: "Configure Supabase credentials to manage barbershop details.",
        notFound: "No barbershop is associated with your account.",
        nameRequired: "Enter a barbershop name before saving.",
        timezoneRequired: "Enter a timezone before saving.",
      },
    },
    servicesPage: {
      title: "Services",
      subtitle: "Manage what clients can book and adjust existing options as needed.",
      createCta: { label: "Create service", accessibility: "Open create service form" },
      listTitle: "Existing services",
      empty: "— none registered yet —",
      serviceMeta: (minutes: number, price: string) => `${minutes} minutes • ${price}`,
      actions: {
        edit: { label: "Edit", accessibility: (name: string) => `Edit ${name}` },
        delete: { label: "Delete", accessibility: (name: string) => `Delete ${name}` },
      },
      alerts: {
        loadTitle: "Services",
        deleteTitle: "Delete service",
        deleteMessage: (name: string) => `Are you sure you want to remove "${name}"?`,
        cancel: "Cancel",
        confirm: "Delete",
        deleteErrorTitle: "Delete service",
      },
    },
    packagesPage: {
      title: "Service packages",
      subtitle: "Offer bundles with special pricing to encourage repeat visits.",
      createCta: { label: "Create package", accessibility: "Open create package form" },
      refresh: "Refresh",
      refreshAccessibility: "Refresh packages",
      listTitle: "Registered packages",
      empty: "— no packages registered yet —",
      priceWithBase: (price: string, base: string) => `${price} • Regular ${base}`,
      discountBadge: (percent: string) => `${percent}% off`,
      itemsLabel: "Included services",
      itemLine: (quantity: number, serviceName: string) => `${quantity} × ${serviceName}`,
      actions: {
        edit: { label: "Edit", accessibility: (name: string) => `Edit ${name}` },
        delete: { label: "Delete", accessibility: (name: string) => `Delete ${name}` },
      },
      alerts: {
        loadTitle: "Packages",
        deleteTitle: "Delete package",
        deleteMessage: (name: string) => `Remove the package "${name}"?`,
        deleteErrorTitle: "Delete package",
        cancel: "Cancel",
        confirm: "Delete",
      },
    },
    productsPage: {
      title: "Products",
      subtitle: "Register the items you sell and keep inventory in sync with sales.",
      createCta: { label: "Register product", accessibility: "Open create product form" },
      listTitle: "Inventory",
      empty: "— no products registered yet —",
      productMeta: (price: string, stock: number) => `${price} • ${stock} in stock`,
      descriptionLabel: "Description",
      priceLabel: "Price",
      stockLabel: "Stock",
      stockValue: (stock: number) => `${stock} ${stock === 1 ? "unit" : "units"}`,
      skuLabel: "SKU",
      actions: {
        edit: { label: "Edit", accessibility: (name: string) => `Edit ${name}` },
        delete: { label: "Delete", accessibility: (name: string) => `Delete ${name}` },
        sell: { label: "Sell", accessibility: (name: string) => `Register a sale for ${name}` },
        restock: { label: "Restock", accessibility: (name: string) => `Restock ${name}` },
      },
      alerts: {
        loadTitle: "Products",
        deleteTitle: "Delete product",
        deleteMessage: (name: string) => `Remove "${name}" from inventory?`,
        cancel: "Cancel",
        confirm: "Delete",
        deleteErrorTitle: "Delete product",
        sellErrorTitle: "Sell product",
        restockErrorTitle: "Restock product",
      },
      stockModal: {
        sellTitle: (name: string) => `Sell ${name}`,
        sellSubtitle: (stock: number) => `Register a sale and reduce the ${stock} items available.`,
        restockTitle: (name: string) => `Restock ${name}`,
        restockSubtitle: "Add items back to inventory.",
        quantityLabel: "Quantity",
        quantityPlaceholder: "1",
        quantityError: "Enter a quantity greater than zero",
        confirmSell: "Confirm sale",
        confirmRestock: "Add stock",
        cancel: "Cancel",
        sellSuccessTitle: "Sale registered",
        sellSuccessMessage: (name: string, quantity: number) => `Sold ${quantity} unit(s) of ${name}.`,
        restockSuccessTitle: "Stock updated",
        restockSuccessMessage: (name: string, quantity: number) => `Added ${quantity} unit(s) to ${name}.`,
      },
    },
    cashRegisterPage: {
      title: "Cash register",
      subtitle: "Track revenue from services and retail in one ledger.",
      refresh: "Refresh",
      refreshAccessibility: "Refresh cash register",
      adjustmentCta: {
        label: "Add adjustment",
        accessibility: "Add a manual adjustment to the cash register",
      },
      summaryTitle: "Summary",
      summary: {
        total: "Total balance",
        services: "Services",
        products: "Products",
        adjustments: "Adjustments",
      },
      ledgerTitle: "Ledger entries",
      empty: "No transactions recorded yet.",
      entryLabels: {
        service: "Service sale",
        product: "Product sale",
        adjustment: "Adjustment",
      },
      entryMeta: {
        quantity: (quantity: number) => `${quantity} unit${quantity === 1 ? "" : "s"}`,
        unitPrice: (price: string) => `Unit: ${price}`,
        reference: (reference: string) => `Reference: ${reference}`,
        note: (note: string) => `Note: ${note}`,
      },
      adjustmentModal: {
        title: "Add adjustment",
        subtitle: "Record manual adjustments such as cash drops or corrections.",
        amountLabel: "Amount",
        amountPlaceholder: "e.g. -50.00",
        amountHelp: "Use a minus sign for cash removed from the register.",
        amountError: "Enter an amount different from zero",
        noteLabel: "Note (optional)",
        referenceLabel: "Reference (optional)",
        cancel: "Cancel",
        confirm: "Save adjustment",
        saving: "Saving...",
        successTitle: "Adjustment saved",
        successMessage: (amount: string) => `Recorded an adjustment of ${amount}.`,
      },
      alerts: {
        loadTitle: "Cash register",
        recordSaleFailedTitle: "Cash register",
        recordSaleFailedMessage: (name: string) =>
          `The sale for "${name}" was created but could not be stored in the cash register. Please add it manually.`,
        adjustmentFailedTitle: "Cash register",
        adjustmentFailedMessage: "Could not record the adjustment. Please try again.",
      },
    },
    serviceForm: COMPONENT_COPY.en.serviceForm,
    servicePackageForm: COMPONENT_COPY.en.servicePackageForm,
    productForm: COMPONENT_COPY.en.productForm,
    assistant: {
      chat: COMPONENT_COPY.en.assistantChat,
      contextSummary: {
        hours: (start: string, end: string) => `Hours: ${start}–${end}`,
        services: (list: string) => `Services: ${list}`,
        serviceDetail: (name: string, minutes: number) => `${name} (${minutes} min)`,
        barbers: (list: string) => `Barbers: ${list}`,
        bookingsScheduled: (count: number) => `Bookings: ${count} scheduled.`,
        bookingsEmpty: "Bookings: none scheduled yet.",
      },
      systemPrompt: {
        intro: "You are AIBarber, an assistant that helps manage a barbershop booking agenda.",
        hours: (start: string, end: string) => `Opening hours: ${start} to ${end}.`,
        servicesHeader: "Services:",
        serviceLine: (name: string, minutes: number, price: string) =>
          `• ${name} (${minutes} minutes • ${price})`,
        barbersHeader: "Barbers:",
        barberLine: (name: string) => `• ${name}`,
        bookingsHeader: "Existing bookings:",
        bookingsEmpty: "(No bookings are currently scheduled.)",
        bookingLine: ({
          date,
          start,
          end,
          serviceName,
          barberName,
          customerName,
        }: {
          date: string;
          start?: string | null;
          end?: string | null;
          serviceName: string;
          barberName: string;
          customerName?: string | null;
        }) => {
          const timeRange = [start, end].filter(Boolean).join("–");
          const timeSegment = timeRange ? ` ${timeRange}` : "";
          const clientSegment = customerName ? ` for ${customerName}` : "";
          return `${date}${timeSegment} • ${serviceName} • ${barberName}${clientSegment}`;
        },
        instructions: [
          "You can use tools to check availability, create bookings, and cancel bookings.",
          "Always collect the customer's first name, last name, and phone number digits before booking.",
          "Use find_customer to check registration with the provided phone number and create_customer if no record exists.",
          "Include the returned customer_id whenever you call book_service so the booking is linked to the customer.",
          "When the user asks to schedule, gather the service, barber, date, and preferred time before making suggestions.",
          "Call get_availability before committing to a new booking, and explain any conflicts you find.",
          "After performing a booking or cancellation, confirm the action and summarize the result for the user.",
        ],
      },
    },
    support: {
      chat: COMPONENT_COPY.en.supportChat,
      contextSummary: [
        "Support channel for AIBarber administrators to share compliments, suggestions, and bug reports.",
        "Collect enough detail so the product and engineering teams can follow up effectively.",
        "Respond with a warm, appreciative tone and confirm their message will reach the right people.",
      ],
      systemPrompt: [
        "You are the AIBarber support assistant helping barbershop managers who use the AIBarber dashboard.",
        "Classify each message as a compliment, suggestion, or bug report and acknowledge it explicitly.",
        "Ask concise follow-up questions when details are missing—especially device, browser, and reproduction steps for bugs.",
        "Summarize key points back to the user and assure them that the team will review their feedback.",
        "If the user needs urgent help or a human, explain how to reach the support team and offer to escalate.",
      ],
      quickReplies: [
        "Share positive feedback",
        "I have a suggestion",
        "Report a bug I found",
        "Check the status of a previous report",
      ],
    },
    userForm: COMPONENT_COPY.en.userForm,
    recurrenceModal: COMPONENT_COPY.en.recurrenceModal,
    occurrencePreview: COMPONENT_COPY.en.occurrencePreview,
    freezeModal: COMPONENT_COPY.en.freezeModal,
    freezePreview: COMPONENT_COPY.en.freezePreview,
    weekTitle: "This week",
    overviewSubtitle: (range?: string | null) =>
      `Overview of bookings scheduled for ${range?.trim() ? range : "the current week"}.`,
    stats: {
      bookingsLabel: "Bookings",
      averagePerDay: (avg: string) => `Avg. ${avg} per day`,
      serviceHoursLabel: "Service hours",
      serviceHoursDetail: "Hours booked",
      revenueLabel: "Revenue",
      revenueDetail: "Based on service prices",
      busiestBarberLabel: "Busiest barber",
      busiestDetail: (count: number) => `${count} booking${count === 1 ? "" : "s"}`,
      avgDuration: (minutes: string) => `${minutes} min avg duration`,
      utilization: (percentage: string) => `${percentage}% capacity used`,
      avgTicket: (value: string) => `Avg. ticket ${value}`,
      topShare: (percentage: string) => `${percentage}% of bookings`,
      noBarberData: "No barber data",
    },
    bookingsByDayTitle: "Booking insights",
    charts: {
      pizzaTitle: "Service spotlight",
      pizzaSubtitle: (service: string) => `Weekly share for ${service}`,
      pizzaEmpty: "No services booked this week.",
      pizzaStat: (percentage: string) => `${percentage}% of weekly bookings`,
      pizzaOther: "Other services",
      pieLegendTitle: "Share of weekly bookings",
      pieLegendEmpty: "No service mix available.",
      barsTitle: "Bookings per day",
      barsSubtitle: "Daily volume for the selected week.",
      barsEmpty: "No bookings recorded for this range.",
      highlightsTitle: "Peaks & lulls",
      highlightsSubtitle: "Busiest and quietest days this week.",
      barberTitle: "Barber leaderboard",
      barberSubtitle: "Ranking by weekly appointments.",
      productsTitle: "Products sold",
      productsSubtitle: "Unit sales compared to item price.",
      productsEmpty: "No product sales recorded yet.",
      productPriceLabel: (price: string) => `Unit price ${price}`,
      productUnits: (count: number) => `${count} sold`,
      busiestDay: (label: string, count: number) => `Busiest: ${label} (${count})`,
      quietestDay: (label: string, count: number) => `Quietest: ${label} (${count})`,
      serviceCount: (count: number) => `${count} booking${count === 1 ? "" : "s"}`,
    },
    dayBookingCount: (count: number) => `${count} booking${count === 1 ? "" : "s"}`,
    noBookings: "No bookings",
    bookings: {
      title: "Bookings",
      subtitle: "Review recent bookings and refine the list using the filters below.",
      ctaLabel: "Book service",
      ctaAccessibility: "Open booking screen",
      filters: {
        barber: "Barber",
        service: "Service",
        client: "Client",
        clientPlaceholder: "Search by client name",
        sort: "Order",
        sortNewest: "Newest first",
        sortOldest: "Oldest first",
        limit: "Records",
        limitOption: (limit: number) => `${limit}`,
        startDate: "Start date (YYYY-MM-DD)",
        startDatePlaceholder: "2025-01-30",
        startTime: "Start time (HH:MM)",
        startTimePlaceholder: "09:00",
        endDate: "End date (YYYY-MM-DD)",
        endDatePlaceholder: "2025-02-02",
        endTime: "End time (HH:MM)",
        endTimePlaceholder: "18:00",
        clear: "Clear filters",
        all: "All",
        toggleShow: "Show filters",
        toggleHide: "Hide filters",
        pickerConfirm: "Apply",
        pickerCancel: "Cancel",
      },
      results: {
        title: "Results",
        count: (current: number, total: number) => `${current} of ${total}`,
        limitNotice: (visible: number, requested: number) =>
          `Showing ${visible} booking${visible === 1 ? "" : "s"} (limit ${requested}).`,
        sectionCount: (count: number) => `${count} booking${count === 1 ? "" : "s"}`,
        empty: "No bookings match your filters.",
        walkIn: "Walk-in",
        whatsappCta: "Send WhatsApp reminder",
        whatsappAccessibility: (client: string) => `Send WhatsApp reminder to ${client}`,
        whatsappErrorTitle: "WhatsApp reminder",
        whatsappErrorMessage: "Unable to open WhatsApp. Please try again.",
        whatsappMessage: ({
          clientName,
          serviceName,
          date,
          time,
        }: {
          clientName: string;
          serviceName: string;
          date: string;
          time: string;
        }) =>
          `Hi ${clientName}, this is a reminder of your appointment for ${serviceName} on ${date} at ${time}.`,
        confirmCta: "Confirm service",
        confirmAccessibility: ({
          serviceName,
          time,
        }: {
          serviceName: string;
          time: string;
        }) => `Confirm ${serviceName} at ${time}`,
        confirmPromptTitle: "Service performed?",
        confirmPromptMessage: ({
          serviceName,
          date,
          time,
        }: {
          serviceName: string;
          date: string;
          time: string;
        }) =>
          `Confirm that ${serviceName} on ${date} at ${time} was completed. The sale will be recorded in the cash register.`,
        confirmPromptConfirm: "Confirm",
        confirmPromptCancel: "Not yet",
        confirming: "Confirming...",
        confirmSuccessTitle: "Service confirmed",
        confirmSuccessMessage: ({
          serviceName,
          date,
          time,
        }: {
          serviceName: string;
          date: string;
          time: string;
        }) => `Marked ${serviceName} on ${date} at ${time} as completed.`,
        confirmSuccessButCashFailed: ({
          serviceName,
          date,
          time,
        }: {
          serviceName: string;
          date: string;
          time: string;
        }) =>
          `Marked ${serviceName} on ${date} at ${time} as completed, but the sale could not be stored automatically.`,
        confirmFailedTitle: "Confirmation failed",
        confirmFailedMessage: "We couldn't mark this booking as completed. Please try again.",
        confirmMissingService: "The service linked to this booking is no longer available.",
        confirmedBadge: "Completed",
        confirmedAt: (label: string) => `Completed ${label}`,
      },
      alerts: {
        loadTitle: "Bookings list",
      },
    },
    bookService: {
      serviceSection: {
        title: "Service",
        empty: "Create your first service below.",
      },
      clientSection: {
        title: "Client",
        noneSelected: "No client selected",
        change: "Change",
        select: "Select",
      },
      barberSectionTitle: "Choose the barber",
      dateSectionTitle: "Pick a day",
      slots: {
        title: (date: string) => `Available slots · ${date}`,
        busyTitle: "Already booked",
        busyMessage: (service: string, barber: string, start: string, end: string) =>
          `${service} with ${barber} • ${start}–${end}`,
        busyFallback: "This time is not available.",
        periods: {
          morning: "Morning",
          afternoon: "Afternoon",
          evening: "Evening",
        },
        empty: "Create a service to see availability.",
      },
      alerts: {
        selectSlot: {
          title: "Select a time",
          message: "Choose an available slot first.",
        },
        selectClient: {
          title: "Select client",
          message: "Choose or create a client first.",
        },
        selectService: {
          title: "Select service",
          message: "Create or choose a service first.",
        },
        bookingSuccessTitle: "Booked!",
        bookingFailureTitle: "Booking failed",
        cancelFailureTitle: "Cancel failed",
        customerErrorTitle: "Customers",
        recurrence: {
          booking: {
            noPreviewTitle: "Nothing to preview",
            noPreviewMessage: "Check the start date, time, and occurrence count.",
            previewFailureTitle: "Preview failed",
            noCreateTitle: "Nothing to create",
            noCreateMessage: "All occurrences were skipped.",
            createSuccessTitle: "Created",
            createSuccessMessage: (count: number, barberName: string, skipped: number) =>
              `Added ${count} with ${barberName}${skipped ? ` • Skipped ${skipped}` : ""}`,
            createFailureTitle: "Create failed",
          },
          freeze: {
            noPreviewTitle: "Nothing to freeze",
            noPreviewMessage: "Check the start date, time, and occurrence count.",
            previewFailureTitle: "Freeze preview failed",
            noCreateTitle: "Nothing to freeze",
            noCreateMessage: "All occurrences were skipped.",
            createSuccessTitle: "Schedule frozen",
            createSuccessMessage: (count: number, barberName: string, skipped: number) =>
              `Frozen ${count} slot${count === 1 ? "" : "s"} for ${barberName}${
                skipped ? ` • Skipped ${skipped}` : ""
              }`,
            createFailureTitle: "Freeze failed",
          },
        },
      },
      actions: {
        book: { label: "Book service", accessibility: "Book service" },
        repeat: { label: "Repeat…", accessibility: "Open recurrence" },
        freeze: { label: "Freeze…", accessibility: "Freeze recurring slots" },
      },
      bookingsList: {
        title: "Your bookings",
        empty: "— none yet —",
        cancel: "Cancel",
        tip: "Tip: select or create the client before the barber; conflicts depend on the barber.",
      },
      clientModal: {
        title: "Select client",
        tabs: { list: "Existing", create: "Create" },
        searchPlaceholder: "Search name / email / phone",
        searchButton: "Search",
        empty: "No results.",
      },
    },
  },
  pt: {
    languageLabel: "Idioma",
    switchLanguage: "Alterar idioma para",
    navigation: {
      overview: "Visão geral",
      bookings: "Agendamentos",
      services: "Serviços",
      packages: "Pacotes",
      products: "Produtos",
      cashRegister: "Caixa",
      assistant: "Assistente",
      support: "Suporte",
      team: "Equipe",
      settings: "Configurações",
      logout: "Sair",
      logoutAccessibility: "Sair do AIBarber",
      logoutErrorTitle: "Falha ao sair",
      logoutErrorMessage: "Não foi possível encerrar a sessão. Tente novamente.",
    },
    loading: {
      title: "Carregando seu painel",
      subtitle: "Aguarde enquanto aplicamos suas preferências.",
    },
    settingsPage: {
      title: "Configurações",
      subtitle: "Gerencie suas preferências no painel do AIBarber.",
      themeLabel: "Aparência",
      themeDescription: "Escolha como o painel adapta as cores.",
      themeOptions: {
        system: "Sistema",
        light: "Claro",
        dark: "Escuro",
      },
      emailConfirmation: {
        title: "Confirme seu e-mail",
        description: (email: string) =>
          email
            ? `O e-mail ${email} ainda não foi confirmado. Reenvie a confirmação para concluir a configuração do workspace.`
            : "Seu e-mail ainda não foi confirmado. Reenvie a confirmação para concluir a configuração do workspace.",
        action: "Reenviar e-mail de confirmação",
        sending: "Enviando...",
        success: "Enviamos um novo e-mail de confirmação. Confira sua caixa de entrada.",
        error: "Não foi possível reenviar o e-mail de confirmação. Tente novamente em instantes.",
      },
      apiStatus: {
        title: "Serviços de IA",
        description: "Verifique a disponibilidade dos recursos de chat e transcrição.",
        refresh: "Verificar novamente",
        refreshing: "Verificando…",
        loading: "Verificando serviços…",
        error: "Não foi possível verificar os serviços.",
        labels: {
          chat: "Assistente de chat",
          transcribe: "Transcrição de voz",
        },
        states: {
          available: "Disponível",
          unavailable: "Indisponível",
          unauthorized: "Não autorizado",
        },
      },
      barbershop: {
        title: "Perfil da barbearia",
        description: "Atualize o nome do workspace, o slug público e o fuso horário.",
        cta: "Editar dados da barbearia",
        ctaAccessibility: "Abrir edição do perfil da barbearia",
      },
      services: {
        title: "Serviços",
        description: "Crie, edite e arquive os serviços disponíveis para agendamento.",
        cta: "Gerenciar serviços",
        ctaAccessibility: "Abrir gerenciamento de serviços",
      },
      packages: {
        title: "Pacotes",
        description: "Combine serviços e ajuste os preços dos pacotes.",
        cta: "Gerenciar pacotes",
        ctaAccessibility: "Abrir gerenciamento de pacotes de serviços",
      },
      team: {
        title: "Membros da equipe",
        description: "Convide e atualize os profissionais que podem acessar o workspace.",
        cta: "Gerenciar equipe",
        ctaAccessibility: "Abrir gerenciamento da equipe",
      },
    },
    teamPage: {
      title: "Equipe",
      subtitle: "Cadastre administradores, gerentes e profissionais com acesso ao sistema.",
      refresh: "Atualizar lista",
      listTitle: "Equipe atual",
      empty: "Nenhum membro cadastrado ainda.",
      alerts: {
        loadTitle: "Equipe",
      },
      roles: [
        {
          value: "administrator",
          label: "Administrador",
          description: "Acesso total à agenda, estoque e configurações.",
        },
        {
          value: "manager",
          label: "Gerente",
          description: "Gerencia agendamentos, serviços e operações diárias.",
        },
        {
          value: "professional",
          label: "Profissional",
          description: "Visualiza sua agenda e atualiza o status dos atendimentos.",
        },
        {
          value: "assistant",
          label: "Assistente",
          description: "Auxilia nos agendamentos e cadastros de clientes.",
        },
      ],
      userForm: {
        ...COMPONENT_COPY.pt.userForm,
        title: "Cadastrar membro da equipe",
        buttons: {
          ...COMPONENT_COPY.pt.userForm.buttons,
          submit: "Salvar membro",
          submitAccessibility: "Salvar membro da equipe",
        },
        alerts: {
          ...COMPONENT_COPY.pt.userForm.alerts,
          savedTitle: "Membro salvo",
          failedFallback: "Não foi possível salvar o membro da equipe.",
        },
      },
    },
    barbershopPage: {
      title: "Perfil da barbearia",
      subtitle: "Atualize as informações compartilhadas com equipe e clientes.",
      empty: "Nenhuma informação de barbearia disponível.",
      fields: {
        nameLabel: "Nome da barbearia",
        namePlaceholder: "Barbearia AIBarber",
        slugLabel: "Slug público (opcional)",
        slugPlaceholder: "barbearia-aibarber",
        slugHelper: "Use letras minúsculas, números e hífens.",
        timezoneLabel: "Fuso horário",
        timezonePlaceholder: "America/Sao_Paulo",
        timezoneHelper: "Usado para disponibilidade e lembretes.",
      },
      actions: {
        save: "Salvar alterações",
        saving: "Salvando…",
        back: "Voltar para configurações",
        retry: "Tentar novamente",
      },
      feedback: {
        saved: "Dados da barbearia atualizados.",
      },
      errors: {
        loadFailed: "Não foi possível carregar os dados da barbearia.",
        saveFailed: "Não foi possível salvar os dados da barbearia.",
        notConfigured: "Configure as credenciais do Supabase para gerenciar os dados da barbearia.",
        notFound: "Nenhuma barbearia está associada à sua conta.",
        nameRequired: "Informe um nome antes de salvar.",
        timezoneRequired: "Informe um fuso horário antes de salvar.",
      },
    },
    servicesPage: {
      title: "Serviços",
      subtitle: "Gerencie o que os clientes podem agendar e ajuste as opções existentes conforme necessário.",
      createCta: { label: "Criar serviço", accessibility: "Abrir formulário de criação de serviço" },
      listTitle: "Serviços cadastrados",
      empty: "— nenhum cadastrado ainda —",
      serviceMeta: (minutes: number, price: string) => `${minutes} minutos • ${price}`,
      actions: {
        edit: { label: "Editar", accessibility: (name: string) => `Editar ${name}` },
        delete: { label: "Excluir", accessibility: (name: string) => `Excluir ${name}` },
      },
      alerts: {
        loadTitle: "Serviços",
        deleteTitle: "Excluir serviço",
        deleteMessage: (name: string) => `Tem certeza de que deseja remover "${name}"?`,
        cancel: "Cancelar",
        confirm: "Excluir",
        deleteErrorTitle: "Excluir serviço",
      },
    },
    packagesPage: {
      title: "Pacotes de serviços",
      subtitle: "Ofereça combos com preço especial para aumentar as visitas recorrentes.",
      createCta: { label: "Criar pacote", accessibility: "Abrir formulário de pacote" },
      refresh: "Atualizar",
      refreshAccessibility: "Atualizar pacotes",
      listTitle: "Pacotes cadastrados",
      empty: "— nenhum pacote cadastrado —",
      priceWithBase: (price: string, base: string) => `${price} • Valor somado ${base}`,
      discountBadge: (percent: string) => `${percent}% de desconto`,
      itemsLabel: "Serviços incluídos",
      itemLine: (quantity: number, serviceName: string) => `${quantity} × ${serviceName}`,
      actions: {
        edit: { label: "Editar", accessibility: (name: string) => `Editar ${name}` },
        delete: { label: "Excluir", accessibility: (name: string) => `Excluir ${name}` },
      },
      alerts: {
        loadTitle: "Pacotes",
        deleteTitle: "Excluir pacote",
        deleteMessage: (name: string) => `Deseja excluir o pacote "${name}"?`,
        deleteErrorTitle: "Excluir pacote",
        cancel: "Cancelar",
        confirm: "Excluir",
      },
    },
    productsPage: {
      title: "Produtos",
      subtitle: "Cadastre os itens de venda e mantenha o estoque atualizado.",
      createCta: { label: "Cadastrar produto", accessibility: "Abrir formulário de produto" },
      listTitle: "Estoque",
      empty: "— nenhum produto cadastrado —",
      productMeta: (price: string, stock: number) => `${price} • ${stock} em estoque`,
      descriptionLabel: "Descrição",
      priceLabel: "Preço",
      stockLabel: "Estoque",
      stockValue: (stock: number) => `${stock} unidade${stock === 1 ? "" : "s"}`,
      skuLabel: "SKU",
      actions: {
        edit: { label: "Editar", accessibility: (name: string) => `Editar ${name}` },
        delete: { label: "Excluir", accessibility: (name: string) => `Excluir ${name}` },
        sell: { label: "Vender", accessibility: (name: string) => `Registrar venda de ${name}` },
        restock: { label: "Repor", accessibility: (name: string) => `Repor estoque de ${name}` },
      },
      alerts: {
        loadTitle: "Produtos",
        deleteTitle: "Excluir produto",
        deleteMessage: (name: string) => `Remover "${name}" do estoque?`,
        cancel: "Cancelar",
        confirm: "Excluir",
        deleteErrorTitle: "Excluir produto",
        sellErrorTitle: "Registrar venda",
        restockErrorTitle: "Repor estoque",
      },
      stockModal: {
        sellTitle: (name: string) => `Vender ${name}`,
        sellSubtitle: (stock: number) => `Registre a venda e desconte das ${stock} unidades disponíveis.`,
        restockTitle: (name: string) => `Repor ${name}`,
        restockSubtitle: "Adicione unidades de volta ao estoque.",
        quantityLabel: "Quantidade",
        quantityPlaceholder: "1",
        quantityError: "Informe uma quantidade maior que zero",
        confirmSell: "Registrar venda",
        confirmRestock: "Adicionar estoque",
        cancel: "Cancelar",
        sellSuccessTitle: "Venda registrada",
        sellSuccessMessage: (name: string, quantity: number) =>
          `Foram vendidas ${quantity} unidade(s) de ${name}.`,
        restockSuccessTitle: "Estoque atualizado",
        restockSuccessMessage: (name: string, quantity: number) =>
          `Adicionadas ${quantity} unidade(s) em ${name}.`,
      },
    },
    cashRegisterPage: {
      title: "Caixa",
      subtitle: "Controle a receita de serviços e produtos em um único livro-caixa.",
      refresh: "Atualizar",
      refreshAccessibility: "Atualizar caixa",
      adjustmentCta: {
        label: "Adicionar ajuste",
        accessibility: "Adicionar um ajuste manual no caixa",
      },
      summaryTitle: "Resumo",
      summary: {
        total: "Saldo total",
        services: "Serviços",
        products: "Produtos",
        adjustments: "Ajustes",
      },
      ledgerTitle: "Lançamentos",
      empty: "Nenhum lançamento registrado.",
      entryLabels: {
        service: "Venda de serviço",
        product: "Venda de produto",
        adjustment: "Ajuste",
      },
      entryMeta: {
        quantity: (quantity: number) => `${quantity} unidade${quantity === 1 ? "" : "s"}`,
        unitPrice: (price: string) => `Unitário: ${price}`,
        reference: (reference: string) => `Referência: ${reference}`,
        note: (note: string) => `Observação: ${note}`,
      },
      adjustmentModal: {
        title: "Adicionar ajuste",
        subtitle: "Registre ajustes manuais como sangrias ou correções.",
        amountLabel: "Valor",
        amountPlaceholder: "ex.: -50,00",
        amountHelp: "Use o sinal de menos para valores retirados do caixa.",
        amountError: "Informe um valor diferente de zero",
        noteLabel: "Observação (opcional)",
        referenceLabel: "Referência (opcional)",
        cancel: "Cancelar",
        confirm: "Salvar ajuste",
        saving: "Salvando...",
        successTitle: "Ajuste salvo",
        successMessage: (amount: string) => `Foi registrado um ajuste de ${amount}.`,
      },
      alerts: {
        loadTitle: "Caixa",
        recordSaleFailedTitle: "Caixa",
        recordSaleFailedMessage: (name: string) =>
          `A venda de "${name}" foi criada, mas não pôde ser registrada no caixa. Faça o lançamento manualmente.`,
        adjustmentFailedTitle: "Caixa",
        adjustmentFailedMessage: "Não foi possível registrar o ajuste. Tente novamente.",
      },
    },
    serviceForm: COMPONENT_COPY.pt.serviceForm,
    servicePackageForm: COMPONENT_COPY.pt.servicePackageForm,
    productForm: COMPONENT_COPY.pt.productForm,
    assistant: {
      chat: COMPONENT_COPY.pt.assistantChat,
      contextSummary: {
        hours: (start: string, end: string) => `Horário: ${start}–${end}`,
        services: (list: string) => `Serviços: ${list}`,
        serviceDetail: (name: string, minutes: number) => `${name} (${minutes} min)`,
        barbers: (list: string) => `Barbeiros: ${list}`,
        bookingsScheduled: (count: number) => `Agendamentos: ${count} marcados.`,
        bookingsEmpty: "Agendamentos: nenhum marcado ainda.",
      },
      systemPrompt: {
        intro: "Você é o AIBarber, um assistente que ajuda a gerenciar a agenda de uma barbearia.",
        hours: (start: string, end: string) => `Horário de funcionamento: ${start} às ${end}.`,
        servicesHeader: "Serviços:",
        serviceLine: (name: string, minutes: number, price: string) =>
          `• ${name} (${minutes} minutos • ${price})`,
        barbersHeader: "Barbeiros:",
        barberLine: (name: string) => `• ${name}`,
        bookingsHeader: "Agendamentos existentes:",
        bookingsEmpty: "(Nenhum agendamento registrado no momento.)",
        bookingLine: ({
          date,
          start,
          end,
          serviceName,
          barberName,
          customerName,
        }: {
          date: string;
          start?: string | null;
          end?: string | null;
          serviceName: string;
          barberName: string;
          customerName?: string | null;
        }) => {
          const timeRange = [start, end].filter(Boolean).join("–");
          const timeSegment = timeRange ? ` ${timeRange}` : "";
          const clientSegment = customerName ? ` para ${customerName}` : "";
          return `${date}${timeSegment} • ${serviceName} • ${barberName}${clientSegment}`;
        },
        instructions: [
          "Você pode usar ferramentas para verificar disponibilidade, criar agendamentos e cancelar agendamentos.",
          "Sempre colete o nome, sobrenome e telefone do cliente antes de agendar.",
          "Use find_customer para conferir o cadastro pelo telefone informado e create_customer se não houver registro.",
          "Inclua o customer_id retornado sempre que chamar book_service para vincular o agendamento ao cliente.",
          "Quando o usuário quiser agendar, reúna serviço, barbeiro, data e horário preferido antes de sugerir opções.",
          "Chame get_availability antes de confirmar um novo agendamento e explique conflitos encontrados.",
          "Após realizar um agendamento ou cancelamento, confirme a ação e resuma o resultado para o usuário.",
        ],
      },
    },
    support: {
      chat: COMPONENT_COPY.pt.supportChat,
      contextSummary: [
        "Canal de suporte para administradores AIBarber enviarem elogios, sugestões e relatos de bugs.",
        "Recolha detalhes suficientes para que produto e engenharia possam acompanhar cada caso.",
        "Mantenha um tom acolhedor e agradeça pelo contato, garantindo que a mensagem chegará ao time certo.",
      ],
      systemPrompt: [
        "Você é o assistente de suporte AIBarber que atende gestores do dashboard.",
        "Classifique cada mensagem como elogio, sugestão ou bug e reconheça explicitamente o tipo de feedback.",
        "Quando faltarem informações, faça perguntas objetivas — para bugs, peça dispositivo, navegador e passos para reproduzir.",
        "Resuma os pontos principais e avise que o time humano analisará o relato.",
        "Se houver urgência ou pedido de contato humano, explique como falar com o suporte e ofereça encaminhamento.",
      ],
      quickReplies: [
        "Compartilhar um elogio",
        "Tenho uma sugestão",
        "Reportar um bug",
        "Acompanhar um relato anterior",
      ],
    },
    userForm: COMPONENT_COPY.pt.userForm,
    recurrenceModal: COMPONENT_COPY.pt.recurrenceModal,
    occurrencePreview: COMPONENT_COPY.pt.occurrencePreview,
    freezeModal: COMPONENT_COPY.pt.freezeModal,
    freezePreview: COMPONENT_COPY.pt.freezePreview,
    weekTitle: "Esta semana",
    overviewSubtitle: (range?: string | null) =>
      `Visão geral dos agendamentos marcados para ${range?.trim() ? range : "a semana atual"}.`,
    stats: {
      bookingsLabel: "Agendamentos",
      averagePerDay: (avg: string) => `Média de ${avg} por dia`,
      serviceHoursLabel: "Horas de serviço",
      serviceHoursDetail: "Horas reservadas",
      revenueLabel: "Receita",
      revenueDetail: "Baseado nos preços dos serviços",
      busiestBarberLabel: "Barbeiro mais ativo",
      busiestDetail: (count: number) => `${count} agendamento${count === 1 ? "" : "s"}`,
      avgDuration: (minutes: string) => `${minutes} min de duração média`,
      utilization: (percentage: string) => `${percentage}% da capacidade usada`,
      avgTicket: (value: string) => `Ticket médio ${value}`,
      topShare: (percentage: string) => `${percentage}% dos agendamentos`,
      noBarberData: "Sem dados de barbeiro",
    },
    bookingsByDayTitle: "Painel de agendamentos",
    charts: {
      pizzaTitle: "Destaque de serviços",
      pizzaSubtitle: (service: string) => `Participação semanal de ${service}`,
      pizzaEmpty: "Nenhum serviço agendado nesta semana.",
      pizzaStat: (percentage: string) => `${percentage}% dos agendamentos da semana`,
      pizzaOther: "Outros serviços",
      pieLegendTitle: "Participação nos agendamentos da semana",
      pieLegendEmpty: "Sem composição de serviços disponível.",
      barsTitle: "Agendamentos por dia",
      barsSubtitle: "Volume diário para a semana selecionada.",
      barsEmpty: "Sem agendamentos neste período.",
      highlightsTitle: "Picos e vales",
      highlightsSubtitle: "Dias mais cheio e mais tranquilo da semana.",
      barberTitle: "Ranking de barbeiros",
      barberSubtitle: "Classificação por atendimentos na semana.",
      productsTitle: "Produtos vendidos",
      productsSubtitle: "Unidades vendidas e preço de cada item.",
      productsEmpty: "Nenhuma venda de produto registrada ainda.",
      productPriceLabel: (price: string) => `Preço unitário ${price}`,
      productUnits: (count: number) => `${count} vendido${count === 1 ? "" : "s"}`,
      busiestDay: (label: string, count: number) => `Dia mais cheio: ${label} (${count})`,
      quietestDay: (label: string, count: number) => `Dia mais tranquilo: ${label} (${count})`,
      serviceCount: (count: number) => `${count} atendimento${count === 1 ? "" : "s"}`,
    },
    dayBookingCount: (count: number) =>
      `${count} agendamento${count === 1 ? "" : "s"}`,
    noBookings: "Nenhum agendamento",
    bookings: {
      title: "Agendamentos",
      subtitle: "Revise os agendamentos recentes e refine a lista usando os filtros abaixo.",
      ctaLabel: "Agendar serviço",
      ctaAccessibility: "Abrir tela de agendamento",
      filters: {
        barber: "Barbeiro",
        service: "Serviço",
        client: "Cliente",
        clientPlaceholder: "Buscar pelo nome do cliente",
        sort: "Ordem",
        sortNewest: "Mais recentes primeiro",
        sortOldest: "Mais antigos primeiro",
        limit: "Registros",
        limitOption: (limit: number) => `${limit}`,
        startDate: "Data inicial (AAAA-MM-DD)",
        startDatePlaceholder: "2025-01-30",
        startTime: "Horário inicial (HH:MM)",
        startTimePlaceholder: "09:00",
        endDate: "Data final (AAAA-MM-DD)",
        endDatePlaceholder: "2025-02-02",
        endTime: "Horário final (HH:MM)",
        endTimePlaceholder: "18:00",
        clear: "Limpar filtros",
        all: "Todos",
        toggleShow: "Mostrar filtros",
        toggleHide: "Ocultar filtros",
        pickerConfirm: "Aplicar",
        pickerCancel: "Cancelar",
      },
      results: {
        title: "Resultados",
        count: (current: number, total: number) => `${current} de ${total}`,
        limitNotice: (visible: number, requested: number) =>
          `Exibindo ${visible} agendamento${visible === 1 ? "" : "s"} (limite ${requested}).`,
        sectionCount: (count: number) => `${count} agendamento${count === 1 ? "" : "s"}`,
        empty: "Nenhum agendamento corresponde aos filtros.",
        walkIn: "Cliente avulso",
        whatsappCta: "Enviar lembrete no WhatsApp",
        whatsappAccessibility: (client: string) => `Enviar lembrete no WhatsApp para ${client}`,
        whatsappErrorTitle: "Lembrete no WhatsApp",
        whatsappErrorMessage: "Não foi possível abrir o WhatsApp. Tente novamente.",
        whatsappMessage: ({
          clientName,
          serviceName,
          date,
          time,
        }: {
          clientName: string;
          serviceName: string;
          date: string;
          time: string;
        }) =>
          `Olá ${clientName}, lembrando do seu horário para ${serviceName} em ${date} às ${time}.`,
        confirmCta: "Confirmar atendimento",
        confirmAccessibility: ({
          serviceName,
          time,
        }: {
          serviceName: string;
          time: string;
        }) => `Confirmar ${serviceName} às ${time}`,
        confirmPromptTitle: "Atendimento realizado?",
        confirmPromptMessage: ({
          serviceName,
          date,
          time,
        }: {
          serviceName: string;
          date: string;
          time: string;
        }) =>
          `Confirme que ${serviceName} em ${date} às ${time} foi concluído. A venda será registrada no caixa.`,
        confirmPromptConfirm: "Confirmar",
        confirmPromptCancel: "Ainda não",
        confirming: "Confirmando...",
        confirmSuccessTitle: "Atendimento confirmado",
        confirmSuccessMessage: ({
          serviceName,
          date,
          time,
        }: {
          serviceName: string;
          date: string;
          time: string;
        }) => `Marcamos ${serviceName} em ${date} às ${time} como concluído.`,
        confirmSuccessButCashFailed: ({
          serviceName,
          date,
          time,
        }: {
          serviceName: string;
          date: string;
          time: string;
        }) =>
          `Marcamos ${serviceName} em ${date} às ${time} como concluído, mas não foi possível lançar a venda automaticamente.`,
        confirmFailedTitle: "Falha ao confirmar",
        confirmFailedMessage: "Não foi possível marcar este agendamento como concluído. Tente novamente.",
        confirmMissingService: "O serviço vinculado a este agendamento não está mais disponível.",
        confirmedBadge: "Concluído",
        confirmedAt: (label: string) => `Concluído ${label}`,
      },
      alerts: {
        loadTitle: "Lista de agendamentos",
      },
    },
    bookService: {
      serviceSection: {
        title: "Serviço",
        empty: "Crie seu primeiro serviço abaixo.",
      },
      clientSection: {
        title: "Cliente",
        noneSelected: "Nenhum cliente selecionado",
        change: "Trocar",
        select: "Selecionar",
      },
      barberSectionTitle: "Escolha o barbeiro",
      dateSectionTitle: "Escolha o dia",
      slots: {
        title: (date: string) => `Horários disponíveis · ${date}`,
        busyTitle: "Já ocupado",
        busyMessage: (service: string, barber: string, start: string, end: string) =>
          `${service} com ${barber} • ${start}–${end}`,
        busyFallback: "Este horário não está disponível.",
        periods: {
          morning: "Manhã",
          afternoon: "Tarde",
          evening: "Noite",
        },
        empty: "Crie um serviço para ver a disponibilidade.",
      },
      alerts: {
        selectSlot: {
          title: "Selecione um horário",
          message: "Escolha um horário disponível primeiro.",
        },
        selectClient: {
          title: "Selecione o cliente",
          message: "Escolha ou crie um cliente primeiro.",
        },
        selectService: {
          title: "Selecione o serviço",
          message: "Crie ou escolha um serviço primeiro.",
        },
        bookingSuccessTitle: "Agendado!",
        bookingFailureTitle: "Falha ao agendar",
        cancelFailureTitle: "Falha ao cancelar",
        customerErrorTitle: "Clientes",
        recurrence: {
          booking: {
            noPreviewTitle: "Nada para pré-visualizar",
            noPreviewMessage: "Verifique a data inicial, o horário e a quantidade de ocorrências.",
            previewFailureTitle: "Erro na pré-visualização",
            noCreateTitle: "Nada para criar",
            noCreateMessage: "Todas as ocorrências foram ignoradas.",
            createSuccessTitle: "Criado",
            createSuccessMessage: (count: number, barberName: string, skipped: number) =>
              `Adicionados ${count} com ${barberName}${skipped ? ` • Ignorados ${skipped}` : ""}`,
            createFailureTitle: "Falha ao criar",
          },
          freeze: {
            noPreviewTitle: "Nada para bloquear",
            noPreviewMessage: "Verifique a data inicial, o horário e a quantidade de ocorrências.",
            previewFailureTitle: "Erro na prévia de bloqueio",
            noCreateTitle: "Nada para bloquear",
            noCreateMessage: "Todas as ocorrências foram ignoradas.",
            createSuccessTitle: "Horários bloqueados",
            createSuccessMessage: (count: number, barberName: string, skipped: number) =>
              `Bloqueado${count === 1 ? "" : "s"} ${count} horário${count === 1 ? "" : "s"} para ${barberName}${
                skipped ? ` • Ignorados ${skipped}` : ""
              }`,
            createFailureTitle: "Falha ao bloquear",
          },
        },
      },
      actions: {
        book: { label: "Agendar serviço", accessibility: "Agendar serviço" },
        repeat: { label: "Repetir…", accessibility: "Abrir recorrência" },
        freeze: { label: "Bloquear…", accessibility: "Bloquear horários recorrentes" },
      },
      bookingsList: {
        title: "Seus agendamentos",
        empty: "— nenhum ainda —",
        cancel: "Cancelar",
        tip: "Dica: selecione/crie o cliente antes do barbeiro; os conflitos dependem do barbeiro.",
      },
      clientModal: {
        title: "Selecionar cliente",
        tabs: { list: "Existentes", create: "Criar" },
        searchPlaceholder: "Buscar nome / e-mail / telefone",
        searchButton: "Buscar",
        empty: "Nenhum resultado.",
      },
    },
  },
} as const;

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: "en", label: "English (US)" },
  { code: "pt", label: "Português (BR)" },
];

export const THEME_OPTIONS: { value: ThemePreference }[] = [
  { value: "system" },
  { value: "light" },
  { value: "dark" },
];

export type AuthenticatedAppCopy = typeof LANGUAGE_COPY;
