# Authentication

## Email confirmation redirect

Set the `EXPO_PUBLIC_EMAIL_CONFIRMATION_REDIRECT_TO` environment variable to the fully-qualified URL of your deployed dashboard (for example, `https://app.example.com`). The value is used when new barbershop administrators sign up or when they request another confirmation email. If the variable is missing, confirmation links fall back to `https://localhost:3000`, which only works in local development.

> Tip: You can also provide the URL through `EXPO_PUBLIC_SITE_URL`, `EXPO_PUBLIC_APP_URL`, or `EXPO_PUBLIC_APP_BASE_URL`. The app will use the first defined value.
