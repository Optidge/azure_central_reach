import test from "node:test";
import assert from "node:assert/strict";
import { buildClientPayload, guardianFromContact } from "../../mappings/client/buildClientPayload.mjs";
import { validateClientPayload } from "../../mappings/client/validateClientPayload.mjs";

test("buildClientPayload maps and normalizes AWS canonical fields", () => {
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
        phone_number__second_: "(212) 555-0202",
        street_address: "123 Main St",
        home_apt: "Apt 2",
        location_city: "Albany",
        location_central_reach: "New York",
        postal_code: "12207",
        guardian_first_name: "Jordan",
        guardian_last_name: "Rivera"
      }
    }
  });

  assert.equal(payload.ExternalSystemId, "deal-1");
  assert.equal(payload.PrimaryEmail, "test@example.com");
  assert.equal(payload.PhoneCell, "2125550101");
  assert.equal(payload.PhoneHome, "2125550202");
  assert.equal(payload.AddressLine1, "123 Main St");
  assert.equal(payload.StateProvince, "NY");
  assert.equal(payload.Gender, "Male");
  assert.equal(payload.DateOfBirth, "2017-01-14T00:00:00.000Z");
});

test("buildClientPayload prefers full home address and stateregion", () => {
  const payload = buildClientPayload({
    deal: {
      id: "deal-2",
      properties: {
        phi_first_name__cloned_: "Alex",
        phi_last_name: "Rivera",
        full_home_address: "9 Guide Ave",
        service_address__other: "4 Other Rd",
        street_address: "123 Main St",
        stateregion: "New Jersey",
        location_central_reach: "New York"
      }
    }
  });

  assert.equal(payload.AddressLine1, "9 Guide Ave");
  assert.equal(payload.StateProvince, "NJ");
});

test("guardianFromContact reads the contact and leaves the Case payload alone", () => {
  const fromContact = guardianFromContact({
    properties: {
      firstname: "Jordan",
      lastname: "Rivera",
      email: "  Parent@Example.com "
    }
  });
  assert.deepEqual(fromContact, {
    GuardianFirstName: "Jordan",
    GuardianLastName: "Rivera",
    PrimaryEmail: "parent@example.com"
  });

  const payload = buildClientPayload({
    deal: {
      id: "deal-1",
      properties: {
        email: "case@example.com",
        guardian_first_name: "Case",
        guardian_last_name: "Sync"
      }
    }
  });
  assert.equal(payload.PrimaryEmail, "case@example.com");
  assert.equal(payload.GuardianFirstName, "Case");
  assert.equal(payload.GuardianLastName, "Sync");
});

test("validateClientPayload enforces required names", () => {
  const valid = validateClientPayload({
    FirstName: "Alex",
    LastName: "Rivera"
  });
  assert.equal(valid.isValid, true);

  const invalid = validateClientPayload({
    FirstName: "",
    LastName: null
  });
  assert.equal(invalid.isValid, false);
  assert.deepEqual(invalid.errors, ["FirstName is required", "LastName is required"]);
});
