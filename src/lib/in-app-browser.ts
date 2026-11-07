/**
 * Google weigert inloggen in de ingebouwde browser van een app. Op Android
 * krijgt een ouder die vanuit Instagram of Facebook komt dan een foutpagina
 * van Google. Op iPhone werkt het wel (getest in de Instagram-app, nov 2026).
 */
export function isAndroidAppBrowser(userAgent: string): boolean {
  return (
    /Android/i.test(userAgent) &&
    /Instagram|FBAN|FBAV|FB_IAB/i.test(userAgent)
  );
}
