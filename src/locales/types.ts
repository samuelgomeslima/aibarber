export type AssistantChatCopy = {
  initialMessage: string;
  apiKeyWarning: string;
  contextPrefix: string;
  quickRepliesTitle: string;
  quickRepliesToggleShow: string;
  quickRepliesToggleHide: string;
  quickReplyAccessibility: (suggestion: string) => string;
  quickReplies: {
    existingBookings: string;
    bookService: string;
    bookSpecificService: (serviceName: string) => string;
    barberAvailability: (barberName: string) => string;
  };
  inputPlaceholder: string;
  sendAccessibility: string;
  typingIndicator: string;
  suggestionsAccessibility: {
    show: string;
    hide: string;
  };
  voiceButtonAccessibility: {
    start: string;
    stop: string;
  };
  errors: {
    generic: string;
    missingApiKey: string;
    voiceWebOnly: string;
    voiceUnsupported: string;
    voiceStartFailed: string;
    noAudio: string;
    processFailed: string;
  };
};

export type ServiceFormCopy = {
  createTitle: string;
  editTitle: string;
  createSubtitle: string;
  editSubtitle: string;
  fields: {
    nameLabel: string;
    namePlaceholder: string;
    nameError: string;
    durationLabel: string;
    durationPlaceholder: string;
    durationError: string;
    priceLabel: string;
    pricePlaceholder: string;
    priceError: string;
    iconLabel: string;
    iconPlaceholder: string;
    iconError: string;
    previewLabel: string;
  };
  buttons: {
    create: string;
    edit: string;
    saving: string;
    cancel: string;
  };
  accessibility: {
    submitCreate: string;
    submitEdit: string;
    cancel: string;
  };
  alerts: {
    createdTitle: string;
    createdMessage: (name: string, minutes: number) => string;
    updatedTitle: string;
    updatedMessage: (name: string, minutes: number) => string;
    createErrorTitle: string;
    updateErrorTitle: string;
  };
};

export type ProductFormCopy = {
  createTitle: string;
  editTitle: string;
  createSubtitle: string;
  editSubtitle: string;
  fields: {
    nameLabel: string;
    namePlaceholder: string;
    nameError: string;
    priceLabel: string;
    pricePlaceholder: string;
    priceError: string;
    costLabel: string;
    costPlaceholder: string;
    costError: string;
    stockLabel: string;
    stockPlaceholder: string;
    stockError: string;
    skuLabel: string;
    skuPlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
  };
  buttons: {
    create: string;
    edit: string;
    saving: string;
    cancel: string;
  };
  accessibility: {
    submitCreate: string;
    submitEdit: string;
    cancel: string;
  };
  alerts: {
    createdTitle: string;
    createdMessage: (name: string, stock: number) => string;
    updatedTitle: string;
    updatedMessage: (name: string, stock: number) => string;
    createErrorTitle: string;
    updateErrorTitle: string;
  };
};

export type ServicePackageFormCopy = {
  createTitle: string;
  editTitle: string;
  createSubtitle: string;
  editSubtitle: string;
  fields: {
    nameLabel: string;
    namePlaceholder: string;
    nameError: string;
    priceLabel: string;
    pricePlaceholder: string;
    priceError: string;
  };
  items: {
    label: string;
    helper: string;
    addLabel: string;
    empty: string;
    removeAccessibility: (serviceName: string) => string;
  };
  lineItem: {
    serviceLabel: string;
    servicePlaceholder: string;
    quantityLabel: string;
    quantityPlaceholder: string;
    quantityError: string;
  };
  summary: {
    title: string;
    subtitle: (count: number) => string;
    packagePriceLabel: string;
    regularPriceLabel: string;
    savingsLabel: string;
    noSavings: string;
    discount: (percent: string) => string;
  };
  buttons: {
    create: string;
    edit: string;
    saving: string;
    cancel: string;
  };
  alerts: {
    createdTitle: string;
    createdMessage: (name: string) => string;
    updatedTitle: string;
    updatedMessage: (name: string) => string;
    createErrorTitle: string;
    updateErrorTitle: string;
  };
  errors: {
    noItems: string;
    invalidItems: string;
    duplicateServices: string;
  };
  accessibility: {
    openServicePicker: string;
    addItem: string;
    submitCreate: string;
    submitEdit: string;
    cancel: string;
  };
  servicePicker: {
    title: string;
    searchPlaceholder: string;
  };
};

type RecommendationDetails = {
  style: string;
  description: string;
  maintenance: string[];
  finish: string;
};

export type ImageAssistantCopy = {
  title: string;
  subtitle: { before: string; highlight: string; after: string };
  helperMessage: string;
  promptLabel: string;
  promptPlaceholder: string;
  sizeLabel: string;
  sizeOptions: ReadonlyArray<{ label: string; value: "256x256" | "512x512" | "1024x1024" }>;
  qualityLabel: string;
  qualityOptions: ReadonlyArray<{ label: string; value: "standard" | "hd"; helper: string }>;
  optionAccessibility: {
    size: (label: string) => string;
    quality: (label: string) => string;
  };
  generateButton: string;
  generateAccessibility: string;
  errors: { generateFailed: string };
  history: {
    title: string;
    clearLabel: string;
    clearAccessibility: string;
    promptLabel: string;
    revisedPrefix: string;
    meta: (size: string, quality: string) => string;
    generatedAt: (timestamp: string) => string;
  };
  upload: {
    label: string;
    button: string;
    changeButton: string;
    removeButton: string;
    helper: string;
    accessibility: string;
    removeAccessibility: string;
    unsupported: string;
    previewLabel: string;
    fileNameLabel: string;
    fileSizeLabel: string;
    unknownSize: string;
    invalidType: string;
    readError: string;
  };
  recommendation: {
    title: string;
    helper: string;
    empty: string;
    maintenanceTitle: string;
    finishTitle: string;
    options: {
      default: RecommendationDetails;
      curls: RecommendationDetails;
      volume: RecommendationDetails;
      corporate: RecommendationDetails;
      feminine: RecommendationDetails;
    };
  };
  guidelines: {
    title: string;
    intro: string;
    items: string[];
  };
  model: {
    title: string;
    name: string;
    description: string;
  };
};

export type UserFormCopy = {
  title: string;
  fields: {
    firstName: { label: string; placeholder: string; required: string };
    lastName: { label: string; placeholder: string; required: string };
    phone: { label: string; placeholder: string; invalid: string };
    email: { label: string; placeholder: string; invalid: string };
    role?: { label: string; placeholder?: string; required: string; invalid: string };
    dateOfBirth: {
      label: string;
      invalid: string;
      future: string;
      minAge: (minAge: number) => string;
    };
  };
  buttons: {
    cancel: string;
    submit: string;
    submitAccessibility: string;
  };
  alerts: {
    savedTitle: string;
    savedMessage: (firstName: string, lastName: string) => string;
    failedTitle: string;
    failedFallback: string;
  };
};

export type RecurrenceFrequency = "weekly" | "every-15-days" | "monthly";

export type RecurrenceModalCopy = {
  title: string;
  labels: {
    service: string;
    barber: string;
    startDate: string;
    time: string;
    frequency: string;
    count: string;
  };
  frequencyOptions: ReadonlyArray<{ value: RecurrenceFrequency; label: string }>;
  placeholders: {
    count: string;
  };
  actions: {
    cancel: string;
    preview: string;
  };
};

export type OccurrencePreviewCopy = {
  title: string;
  summary: (created: number, skipped: number) => string;
  headers: {
    date: string;
    time: string;
    status: string;
  };
  status: {
    ok: string;
    conflict: string;
    outsideHours: string;
  };
  actions: {
    back: string;
    confirm: (count: number) => string;
  };
};

export type ServicePackagesPageCopy = {
  title: string;
  subtitle: string;
  createCta: { label: string; accessibility: string };
  refresh: string;
  refreshAccessibility: string;
  listTitle: string;
  empty: string;
  priceWithBase: (price: string, base: string) => string;
  discountBadge: (percent: string) => string;
  itemsLabel: string;
  itemLine: (quantity: number, serviceName: string) => string;
  actions: {
    edit: { label: string; accessibility: (name: string) => string };
    delete: { label: string; accessibility: (name: string) => string };
  };
  alerts: {
    loadTitle: string;
    deleteTitle: string;
    deleteMessage: (name: string) => string;
    deleteErrorTitle: string;
    cancel: string;
    confirm: string;
  };
};
