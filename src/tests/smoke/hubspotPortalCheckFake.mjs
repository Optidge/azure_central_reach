// Finding F-3: every HubSpot call first checks, once per process, that the token belongs to the
// configured portal (GET /account-info/v3/details, src/lib/hubspotClient.mjs). A test that runs
// the real HubSpot client behind a fake HTTP adapter wraps its adapter with this helper, so the
// check is answered with the configured portal and every other request reaches the test's own
// adapter unchanged. No live call.
export const PORTAL_CHECK_PORTAL_ID = "52311591";
export const ACCOUNT_DETAILS_PATH = "/account-info/v3/details";

// The hubspot block of a config for a test that runs the real HubSpot client.
export function portalCheckedHubSpotConfig(extra = {}) {
  return {
    hubspot: {
      baseUrl: "https://hubspot.invalid",
      privateAppToken: "test",
      hubspotPortalId: PORTAL_CHECK_PORTAL_ID,
      ...extra
    }
  };
}

// The answer to the portal check, or null for any other request.
export function portalCheckAnswer(requestConfig, portalId = PORTAL_CHECK_PORTAL_ID) {
  if (String(requestConfig?.url || "") !== ACCOUNT_DETAILS_PATH) {
    return null;
  }
  return {
    status: 200,
    statusText: "OK",
    headers: {},
    config: requestConfig,
    data: { portalId: Number(portalId), accountType: "SANDBOX" }
  };
}

// Wraps a fake adapter: the portal check is answered here, every other request goes on.
export function answeringPortalCheck(adapter, portalId = PORTAL_CHECK_PORTAL_ID) {
  return async (requestConfig) =>
    portalCheckAnswer(requestConfig, portalId) ?? adapter(requestConfig);
}
