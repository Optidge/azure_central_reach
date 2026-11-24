import test from "node:test";
import assert from "node:assert/strict";
import { buildClientPayload } from "../../mappings/client/buildClientPayload.mjs";
import { validateClientPayload } from "../../mappings/client/validateClientPayload.mjs";

// Changed in Stage 4 (row 4.1): the state is read from stateregion, not location_central_reach.
// Changed by decision 36: phone_number__second_ is not read and PhoneHome is not in the payload.
test("[C8][4.1] buildClientPayload maps and normalizes AWS canonical fields", () => {
  const payload = buildClientPayload({
    deal: {
      id: "deal-1",
      properties: {
        hs_object_id: "deal-1",
        phi_first_name__cloned_: "Alex",
        phi_last_name: "Rivera",
        phi_date_of_birth: "2017-01-14",
        phi_gender: "male",
        email: "  TeSt@Example.com ",
        phone: "+1 (212) 555-0101",
        street_address: "123 Main St",
        home_apt: "Apt 2",
        location_city: "Albany",
        stateregion: "New York",
        postal_code: "12207",
        guardian_first_name: "Jordan",
        guardian_last_name: "Rivera"
      }
    }
  });

  assert.equal(payload.ExternalSystemId, "deal-1");
  assert.equal(payload.PrimaryEmail, "test@example.com");
  assert.equal(payload.PhoneCell, "2125550101");
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "PhoneHome"), false);
  assert.equal(payload.StateProvince, "NY");
  assert.equal(payload.Gender, "Male");
  assert.equal(payload.DateOfBirth, "2017-01-14T00:00:00.000Z");
});

// Item 5 ("use hte fall back"; on an unreadable stateregion, "confirmed"): StateProvince is
// stateregion, else location, else left out. An unreadable stateregion is a warning, not an error.
test("[C8][4.1] item 5: StateProvince is stateregion, else location; an unreadable stateregion falls back with a warning naming the property, never the value", () => {
  const map = (properties) => buildClientPayload({ deal: { id: "deal-1", properties } });

  const upper = map({ stateregion: "NEW YORK", location: "Colorado" });
  assert.equal(upper.StateProvince, "NY");
  assert.deepEqual(upper.warnings, []);

  const fallback = map({ stateregion: "", location: "Colorado" });
  assert.equal(fallback.StateProvince, "CO");
  assert.deepEqual(fallback.warnings, []);

  const unreadable = map({ stateregion: "Brooklyn", location: "New York" });
  assert.equal(unreadable.StateProvince, "NY");
  assert.deepEqual(unreadable.unreadableValueProperties, []);
  assert.deepEqual(unreadable.warnings, [{ code: "state_unreadable_used_location", property: "stateregion" }]);

  const noFallback = map({ stateregion: "Brooklyn", location: "" });
  assert.equal(noFallback.StateProvince, null);
  assert.deepEqual(noFallback.warnings, [{ code: "state_unreadable_no_fallback", property: "stateregion" }]);
  assert.equal(JSON.stringify(noFallback.warnings).includes("Brooklyn"), false);

  const neither = map({ stateregion: "", location: "" });
  assert.equal(neither.StateProvince, null);
  assert.deepEqual(neither.warnings, []);
});

test("validateClientPayload enforces required names", () => {
  const valid = validateClientPayload(
    { FirstName: "Alex", LastName: "Rivera" },
    { linked: true }
  );
  assert.equal(valid.isValid, true);

  const invalid = validateClientPayload(
    { FirstName: "", LastName: null },
    { linked: true }
  );
  assert.equal(invalid.isValid, false);
  assert.deepEqual(invalid.errors, [
    "Missing required field: phi_first_name__cloned_",
    "Missing required field: phi_last_name"
  ]);
});
