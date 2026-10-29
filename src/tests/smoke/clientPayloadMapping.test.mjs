import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClientPayload,
  guardianFromContact,
  selectGuardianSource
} from "../../mappings/client/buildClientPayload.mjs";
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

function guardianDeal() {
  return {
    id: "deal-1",
    properties: {
      email: "case@example.com",
      guardian_first_name: "Case",
      guardian_last_name: "Sync"
    }
  };
}

function guardianContact({ id, typeIds, category, firstname, lastname, email }) {
  return {
    id,
    typeIds,
    properties: {
      firstname,
      lastname,
      email,
      contact_category: category
    }
  };
}

test("one qualifying Parent/Guardian contact supplies name and email", () => {
  const deal = guardianDeal();
  const contacts = [
    guardianContact({
      id: "101",
      typeIds: [3],
      category: "Parent/Guardian",
      firstname: "Jordan",
      lastname: "Rivera",
      email: "  Parent@Example.com "
    })
  ];

  const source = selectGuardianSource({ deal, contacts });
  assert.equal(source.source, "contact");
  assert.equal(source.contactId, "101");

  const payload = buildClientPayload({ deal, contacts });
  assert.equal(payload.GuardianFirstName, "Jordan");
  assert.equal(payload.GuardianLastName, "Rivera");
  assert.equal(payload.PrimaryEmail, "parent@example.com");
});

test("zero qualifying contacts use the Case guardian fields", () => {
  const deal = guardianDeal();
  const source = selectGuardianSource({ deal, contacts: [] });
  assert.equal(source.source, "case");
  assert.equal(source.contactId, null);

  const payload = buildClientPayload({ deal, contacts: [] });
  assert.equal(payload.GuardianFirstName, "Case");
  assert.equal(payload.GuardianLastName, "Sync");
  assert.equal(payload.PrimaryEmail, "case@example.com");
});

test("two qualifying contacts use the Case guardian fields", () => {
  const deal = guardianDeal();
  const contacts = [
    guardianContact({
      id: "101",
      typeIds: [3],
      category: "Parent/Guardian",
      firstname: "Jordan",
      lastname: "Rivera",
      email: "parent@example.com"
    }),
    guardianContact({
      id: "102",
      typeIds: [3],
      category: "Parent/Guardian",
      firstname: "Avery",
      lastname: "Rivera",
      email: "avery@example.com"
    })
  ];

  const source = selectGuardianSource({ deal, contacts });
  assert.equal(source.source, "case");
  assert.equal(source.contactId, null);

  const payload = buildClientPayload({ deal, contacts });
  assert.equal(payload.GuardianFirstName, "Case");
  assert.equal(payload.GuardianLastName, "Sync");
  assert.equal(payload.PrimaryEmail, "case@example.com");
});

test("a contact with a different category does not count", () => {
  const deal = guardianDeal();
  const parent = guardianContact({
    id: "101",
    typeIds: [3],
    category: "Parent/Guardian",
    firstname: "Jordan",
    lastname: "Rivera",
    email: "parent@example.com"
  });
  const teammate = guardianContact({
    id: "102",
    typeIds: [3],
    category: "Team Member",
    firstname: "Sam",
    lastname: "Other",
    email: "sam@example.com"
  });

  const onlyOther = buildClientPayload({ deal, contacts: [teammate] });
  assert.equal(onlyOther.GuardianFirstName, "Case");
  assert.equal(onlyOther.GuardianLastName, "Sync");
  assert.equal(onlyOther.PrimaryEmail, "case@example.com");

  const withParent = buildClientPayload({ deal, contacts: [parent, teammate] });
  assert.equal(withParent.GuardianFirstName, "Jordan");
  assert.equal(withParent.GuardianLastName, "Rivera");
  assert.equal(withParent.PrimaryEmail, "parent@example.com");
});

test("an association type other than 3 does not count", () => {
  const deal = guardianDeal();
  const unlabeled = guardianContact({
    id: "101",
    typeIds: [3],
    category: "Parent/Guardian",
    firstname: "Jordan",
    lastname: "Rivera",
    email: "parent@example.com"
  });
  const otherType = guardianContact({
    id: "102",
    typeIds: [76],
    category: "Parent/Guardian",
    firstname: "Sam",
    lastname: "Other",
    email: "sam@example.com"
  });

  const onlyOtherType = buildClientPayload({ deal, contacts: [otherType] });
  assert.equal(onlyOtherType.GuardianFirstName, "Case");
  assert.equal(onlyOtherType.GuardianLastName, "Sync");
  assert.equal(onlyOtherType.PrimaryEmail, "case@example.com");

  const withUnlabeled = buildClientPayload({ deal, contacts: [unlabeled, otherType] });
  assert.equal(withUnlabeled.GuardianFirstName, "Jordan");
  assert.equal(withUnlabeled.GuardianLastName, "Rivera");
  assert.equal(withUnlabeled.PrimaryEmail, "parent@example.com");
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
