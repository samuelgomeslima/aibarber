import type {
  AssistantChatCopy,
  ImageAssistantCopy,
  OccurrencePreviewCopy,
  RecurrenceModalCopy,
  ServiceFormCopy,
  ProductFormCopy,
  UserFormCopy,
} from "./types";

type SupportedLanguage = "en" | "pt";

type ComponentCopy = {
  assistantChat: AssistantChatCopy;
  imageAssistant: ImageAssistantCopy;
  serviceForm: ServiceFormCopy;
  productForm: ProductFormCopy;
  userForm: UserFormCopy;
  recurrenceModal: RecurrenceModalCopy;
  occurrencePreview: OccurrencePreviewCopy;
};

export const COMPONENT_COPY: Record<SupportedLanguage, ComponentCopy> = {
  en: {
    assistantChat: {
      initialMessage:
        "Hi! I'm your AIBarber agent. I can check availability, book services, and cancel existing appointments for you.",
      apiKeyWarning: "Set EXPO_PUBLIC_OPENAI_API_KEY to enable the assistant.",
      contextPrefix: "Booking context:",
      quickRepliesTitle: "Suggested prompts",
      quickRepliesToggleShow: "Show suggestions",
      quickRepliesToggleHide: "Hide quick suggestions",
      quickReplyAccessibility: (suggestion: string) => `Send quick message: ${suggestion}`,
      quickReplies: {
        existingBookings: "Show my existing bookings",
        bookService: "Help me book a service",
        bookSpecificService: (serviceName: string) => `Book a ${serviceName}`,
        barberAvailability: (barberName: string) => `Available hours for ${barberName}`,
      },
      inputPlaceholder: "Ask about bookings...",
      sendAccessibility: "Send message",
      typingIndicator: "Typing…",
      suggestionsAccessibility: {
        show: "Show quick suggestions",
        hide: "Hide quick suggestions",
      },
      voiceButtonAccessibility: {
        start: "Start voice input",
        stop: "Stop voice input",
      },
      errors: {
        generic: "Something went wrong.",
        missingApiKey: "Set EXPO_PUBLIC_OPENAI_API_KEY to enable voice input.",
        voiceWebOnly: "Voice capture is currently supported on the web experience only.",
        voiceUnsupported: "Voice capture is not supported in this browser.",
        voiceStartFailed: "Unable to start voice recording.",
        noAudio: "No audio captured. Try again.",
        processFailed: "Failed to process voice message.",
      },
    },
    imageAssistant: {
      title: "Image assistant",
      subtitle: {
        before: "Generate marketing visuals for your shop using the OpenAI image API deployed under ",
        highlight: "/api/GenerateImage",
        after: ".",
      },
      helperMessage: "Set EXPO_PUBLIC_IMAGE_API_TOKEN to authenticate requests to the GenerateImage function.",
      promptLabel: "Prompt",
      promptPlaceholder:
        "Create a premium hero image for a barber shop website featuring a modern haircut session.",
      sizeLabel: "Size",
      sizeOptions: [
        { label: "Square • 256px", value: "256x256" },
        { label: "Detailed • 512px", value: "512x512" },
        { label: "Showcase • 1024px", value: "1024x1024" },
      ],
      qualityLabel: "Quality",
      qualityOptions: [
        { label: "Standard", value: "standard", helper: "Fastest option for quick previews." },
        { label: "HD", value: "hd", helper: "Sharper output, slightly slower." },
      ],
      optionAccessibility: {
        size: (label: string) => `Select ${label} size`,
        quality: (label: string) => `Use ${label} quality`,
      },
      generateButton: "Generate image",
      generateAccessibility: "Generate marketing image",
      errors: {
        generateFailed: "Unable to generate image.",
      },
      history: {
        title: "Recent results",
        clearLabel: "Clear",
        clearAccessibility: "Clear generated images",
        promptLabel: "Prompt:",
        revisedPrefix: "Revised prompt:",
        meta: (size: string, quality: string) => `Size: ${size} • Quality: ${quality}`,
        generatedAt: (timestamp: string) => `Generated ${timestamp}`,
      },
    },
    serviceForm: {
      createTitle: "Register a service",
      editTitle: "Edit service",
      createSubtitle: "Services define the duration and price of each booking.",
      editSubtitle: "Adjust the duration, price, or icon for this service.",
      fields: {
        nameLabel: "Name",
        namePlaceholder: "Cut & Style",
        nameError: "Name is required",
        durationLabel: "Duration (minutes)",
        durationPlaceholder: "45",
        durationError: "Enter minutes > 0",
        priceLabel: "Price",
        pricePlaceholder: "30.00",
        priceError: "Enter a valid price",
        iconLabel: "Icon",
        iconPlaceholder: "Choose an icon",
        iconError: "Select an icon",
        previewLabel: "Preview:",
      },
      buttons: {
        create: "Create service",
        edit: "Save changes",
        saving: "Saving…",
        cancel: "Cancel",
      },
      accessibility: {
        submitCreate: "Create service",
        submitEdit: "Save service changes",
        cancel: "Cancel service form",
      },
      alerts: {
        createdTitle: "Service created",
        createdMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
        updatedTitle: "Service updated",
        updatedMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
        createErrorTitle: "Create service failed",
        updateErrorTitle: "Update service failed",
      },
    },
    productForm: {
      createTitle: "Register a product",
      editTitle: "Edit product",
      createSubtitle: "Track retail items, pricing and stock from a single place.",
      editSubtitle: "Update the price, stock level or description for this product.",
      fields: {
        nameLabel: "Name",
        namePlaceholder: "Shampoo",
        nameError: "Name is required",
        priceLabel: "Price",
        pricePlaceholder: "49.90",
        priceError: "Enter a valid price",
        costLabel: "Cost",
        costPlaceholder: "18.50",
        costError: "Enter a valid cost",
        stockLabel: "Stock",
        stockPlaceholder: "12",
        stockError: "Enter a stock quantity",
        skuLabel: "SKU",
        skuPlaceholder: "SKU-001",
        descriptionLabel: "Description",
        descriptionPlaceholder: "Notes about the product, scent or usage.",
      },
      buttons: {
        create: "Save product",
        edit: "Save changes",
        saving: "Saving…",
        cancel: "Cancel",
      },
      accessibility: {
        submitCreate: "Save product",
        submitEdit: "Save product changes",
        cancel: "Cancel product form",
      },
      alerts: {
        createdTitle: "Product saved",
        createdMessage: (name: string, stock: number) => `${name} (${stock} in stock)`,
        updatedTitle: "Product updated",
        updatedMessage: (name: string, stock: number) => `${name} (${stock} in stock)`,
        createErrorTitle: "Create product failed",
        updateErrorTitle: "Update product failed",
      },
    },
    userForm: {
      title: "Create user",
      fields: {
        firstName: {
          label: "First name",
          placeholder: "e.g., Therese",
          required: "Required",
        },
        lastName: {
          label: "Surname",
          placeholder: "e.g., Silva",
          required: "Required",
        },
        phone: {
          label: "Cell phone",
          placeholder: "(11) 99999-9999",
          invalid: "Enter a valid phone",
        },
        email: {
          label: "Email",
          placeholder: "therese@email.com",
          invalid: "Enter a valid email",
        },
        role: {
          label: "Role",
          placeholder: "Select a role",
          required: "Select a role",
          invalid: "Choose a valid role",
        },
        dateOfBirth: {
          label: "Date of birth",
          invalid: "Select a valid date",
          future: "Date of birth cannot be in the future",
          minAge: (minAge: number) => `Minimum age is ${minAge}`,
        },
      },
      buttons: {
        cancel: "Cancel",
        submit: "Save user",
        submitAccessibility: "Save user",
      },
      alerts: {
        savedTitle: "User saved",
        savedMessage: (first: string, last: string) => `${first} ${last}`,
        failedTitle: "Save failed",
        failedFallback: "Unable to save the user.",
      },
    },
    recurrenceModal: {
      title: "Repeat booking",
      labels: {
        service: "Service",
        barber: "Barber",
        startDate: "Start date",
        time: "Time",
        frequency: "Frequency",
        count: "Count (1–10)",
      },
      frequencyOptions: [
        { value: "weekly", label: "Weekly" },
        { value: "every-15-days", label: "Every two weeks" },
        { value: "monthly", label: "Monthly" },
      ],
      placeholders: {
        count: "10",
      },
      actions: {
        cancel: "Cancel",
        preview: "Preview",
      },
    },
    occurrencePreview: {
      title: "Preview recurring bookings",
      summary: (created: number, skipped: number) =>
        `${created} will be created${skipped ? ` • ${skipped} skipped` : ""}`,
      headers: {
        date: "Date",
        time: "Time",
        status: "Status",
      },
      status: {
        ok: "OK",
        conflict: "Conflict",
        outsideHours: "Outside hours",
      },
      actions: {
        back: "Back",
        confirm: (count: number) => `Create ${count}`,
      },
    },
  },
  pt: {
    assistantChat: {
      initialMessage:
        "Olá! Sou o seu agente AIBarber. Posso verificar disponibilidade, agendar serviços e cancelar compromissos existentes para você.",
      apiKeyWarning: "Defina EXPO_PUBLIC_OPENAI_API_KEY para habilitar o assistente.",
      contextPrefix: "Contexto de agendamentos:",
      quickRepliesTitle: "Prompts sugeridos",
      quickRepliesToggleShow: "Mostrar sugestões",
      quickRepliesToggleHide: "Ocultar sugestões rápidas",
      quickReplyAccessibility: (suggestion: string) => `Enviar mensagem rápida: ${suggestion}`,
      quickReplies: {
        existingBookings: "Mostrar meus agendamentos",
        bookService: "Ajudar a agendar um serviço",
        bookSpecificService: (serviceName: string) => `Agendar ${serviceName}`,
        barberAvailability: (barberName: string) => `Horários disponíveis para ${barberName}`,
      },
      inputPlaceholder: "Pergunte sobre os agendamentos...",
      sendAccessibility: "Enviar mensagem",
      typingIndicator: "Digitando…",
      suggestionsAccessibility: {
        show: "Mostrar sugestões rápidas",
        hide: "Ocultar sugestões rápidas",
      },
      voiceButtonAccessibility: {
        start: "Iniciar entrada por voz",
        stop: "Parar entrada por voz",
      },
      errors: {
        generic: "Algo deu errado.",
        missingApiKey: "Defina EXPO_PUBLIC_OPENAI_API_KEY para habilitar a entrada por voz.",
        voiceWebOnly: "A captura de voz está disponível apenas na experiência web no momento.",
        voiceUnsupported: "A captura de voz não é suportada neste navegador.",
        voiceStartFailed: "Não foi possível iniciar a gravação de voz.",
        noAudio: "Nenhum áudio capturado. Tente novamente.",
        processFailed: "Falha ao processar a mensagem de voz.",
      },
    },
    imageAssistant: {
      title: "Laboratório de imagens",
      subtitle: {
        before: "Gere visuais de marketing para a sua barbearia usando a API de imagens da OpenAI disponível em ",
        highlight: "/api/GenerateImage",
        after: ".",
      },
      helperMessage:
        "Defina EXPO_PUBLIC_IMAGE_API_TOKEN para autenticar as requisições para a função GenerateImage.",
      promptLabel: "Prompt",
      promptPlaceholder:
        "Crie uma imagem hero premium para o site de uma barbearia mostrando um corte moderno.",
      sizeLabel: "Tamanho",
      sizeOptions: [
        { label: "Quadrado • 256px", value: "256x256" },
        { label: "Detalhado • 512px", value: "512x512" },
        { label: "Vitrine • 1024px", value: "1024x1024" },
      ],
      qualityLabel: "Qualidade",
      qualityOptions: [
        { label: "Padrão", value: "standard", helper: "Opção mais rápida para pré-visualizações." },
        { label: "HD", value: "hd", helper: "Resultado mais nítido, um pouco mais lento." },
      ],
      optionAccessibility: {
        size: (label: string) => `Selecionar tamanho ${label}`,
        quality: (label: string) => `Usar qualidade ${label}`,
      },
      generateButton: "Gerar imagem",
      generateAccessibility: "Gerar imagem de marketing",
      errors: {
        generateFailed: "Não foi possível gerar a imagem.",
      },
      history: {
        title: "Resultados recentes",
        clearLabel: "Limpar",
        clearAccessibility: "Limpar imagens geradas",
        promptLabel: "Prompt:",
        revisedPrefix: "Prompt revisado:",
        meta: (size: string, quality: string) => `Tamanho: ${size} • Qualidade: ${quality}`,
        generatedAt: (timestamp: string) => `Gerado em ${timestamp}`,
      },
    },
    serviceForm: {
      createTitle: "Cadastrar serviço",
      editTitle: "Editar serviço",
      createSubtitle: "Os serviços definem a duração e o preço de cada agendamento.",
      editSubtitle: "Ajuste a duração, o preço ou o ícone deste serviço.",
      fields: {
        nameLabel: "Nome",
        namePlaceholder: "Corte & Estilo",
        nameError: "Nome é obrigatório",
        durationLabel: "Duração (minutos)",
        durationPlaceholder: "45",
        durationError: "Informe minutos > 0",
        priceLabel: "Preço",
        pricePlaceholder: "30,00",
        priceError: "Informe um preço válido",
        iconLabel: "Ícone",
        iconPlaceholder: "Escolha um ícone",
        iconError: "Selecione um ícone",
        previewLabel: "Prévia:",
      },
      buttons: {
        create: "Criar serviço",
        edit: "Salvar alterações",
        saving: "Salvando…",
        cancel: "Cancelar",
      },
      accessibility: {
        submitCreate: "Criar serviço",
        submitEdit: "Salvar alterações do serviço",
        cancel: "Cancelar formulário de serviço",
      },
      alerts: {
        createdTitle: "Serviço criado",
        createdMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
        updatedTitle: "Serviço atualizado",
        updatedMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
        createErrorTitle: "Falha ao criar serviço",
        updateErrorTitle: "Falha ao atualizar serviço",
      },
    },
    productForm: {
      createTitle: "Cadastrar produto",
      editTitle: "Editar produto",
      createSubtitle: "Controle itens de venda, preços e estoque em um só lugar.",
      editSubtitle: "Atualize preço, estoque ou descrição deste produto.",
      fields: {
        nameLabel: "Nome",
        namePlaceholder: "Shampoo",
        nameError: "Nome é obrigatório",
        priceLabel: "Preço",
        pricePlaceholder: "49,90",
        priceError: "Informe um preço válido",
        costLabel: "Custo",
        costPlaceholder: "18,50",
        costError: "Informe um custo válido",
        stockLabel: "Estoque",
        stockPlaceholder: "12",
        stockError: "Informe a quantidade em estoque",
        skuLabel: "SKU",
        skuPlaceholder: "SKU-001",
        descriptionLabel: "Descrição",
        descriptionPlaceholder: "Anotações sobre o produto, fragrância ou uso.",
      },
      buttons: {
        create: "Salvar produto",
        edit: "Salvar alterações",
        saving: "Salvando…",
        cancel: "Cancelar",
      },
      accessibility: {
        submitCreate: "Salvar produto",
        submitEdit: "Salvar alterações do produto",
        cancel: "Cancelar formulário de produto",
      },
      alerts: {
        createdTitle: "Produto salvo",
        createdMessage: (name: string, stock: number) => `${name} (${stock} em estoque)`,
        updatedTitle: "Produto atualizado",
        updatedMessage: (name: string, stock: number) => `${name} (${stock} em estoque)`,
        createErrorTitle: "Falha ao criar produto",
        updateErrorTitle: "Falha ao atualizar produto",
      },
    },
    userForm: {
      title: "Criar cliente",
      fields: {
        firstName: {
          label: "Nome",
          placeholder: "ex.: Terezinha",
          required: "Obrigatório",
        },
        lastName: {
          label: "Sobrenome",
          placeholder: "ex.: Silva",
          required: "Obrigatório",
        },
        phone: {
          label: "Celular",
          placeholder: "(11) 99999-9999",
          invalid: "Informe um telefone válido",
        },
        email: {
          label: "E-mail",
          placeholder: "terezinha@email.com",
          invalid: "Informe um e-mail válido",
        },
        role: {
          label: "Função",
          placeholder: "Selecione uma função",
          required: "Selecione uma função",
          invalid: "Escolha uma função válida",
        },
        dateOfBirth: {
          label: "Data de nascimento",
          invalid: "Selecione uma data válida",
          future: "A data não pode estar no futuro",
          minAge: (minAge: number) => `Idade mínima de ${minAge} anos`,
        },
      },
      buttons: {
        cancel: "Cancelar",
        submit: "Salvar cliente",
        submitAccessibility: "Salvar cliente",
      },
      alerts: {
        savedTitle: "Cliente salvo",
        savedMessage: (first: string, last: string) => `${first} ${last}`,
        failedTitle: "Falha ao salvar",
        failedFallback: "Não foi possível salvar o cliente.",
      },
    },
    recurrenceModal: {
      title: "Repetir agendamento",
      labels: {
        service: "Serviço",
        barber: "Barbeiro",
        startDate: "Data inicial",
        time: "Horário",
        frequency: "Frequência",
        count: "Quantidade (1–10)",
      },
      frequencyOptions: [
        { value: "weekly", label: "Semanal" },
        { value: "every-15-days", label: "A cada duas semanas" },
        { value: "monthly", label: "Mensal" },
      ],
      placeholders: {
        count: "10",
      },
      actions: {
        cancel: "Cancelar",
        preview: "Pré-visualizar",
      },
    },
    occurrencePreview: {
      title: "Prévia de recorrências",
      summary: (created: number, skipped: number) =>
        `${created} serão criados${skipped ? ` • ${skipped} ignorados` : ""}`,
      headers: {
        date: "Data",
        time: "Horário",
        status: "Status",
      },
      status: {
        ok: "OK",
        conflict: "Conflito",
        outsideHours: "Fora do horário",
      },
      actions: {
        back: "Voltar",
        confirm: (count: number) => `Criar ${count}`,
      },
    },
  },
} as const;

export const DEFAULT_COMPONENT_LANGUAGE: SupportedLanguage = "en";
export const defaultComponentCopy = COMPONENT_COPY[DEFAULT_COMPONENT_LANGUAGE];
