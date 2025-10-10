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
    regularPriceLabel: string;
    regularPricePlaceholder: string;
    regularPriceHelper?: string;
    regularPriceError: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    itemsLabel: string;
    addItemLabel: string;
    itemsEmptyError: string;
    itemsInvalidError: string;
    itemTitle: (index: number) => string;
    itemServiceLabel: string;
    itemServicePlaceholder: string;
    itemServiceError: string;
    itemQuantityLabel: string;
    itemQuantityPlaceholder: string;
    itemQuantityError: string;
    pickerTitle: string;
    pickerSubtitle: string;
    pickerSearchPlaceholder: string;
    pickerCloseLabel: string;
    pickerOptionMeta: (minutes: number, price: string) => string;
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
    addItem: string;
    removeItem: (index: number) => string;
    openServicePicker: (index: number) => string;
    selectService: (name: string) => string;
    closePicker: string;
  };
  alerts: {
    createdTitle: string;
    createdMessage: (name: string) => string;
    updatedTitle: string;
    updatedMessage: (name: string) => string;
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
