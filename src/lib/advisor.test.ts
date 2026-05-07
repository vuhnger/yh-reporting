import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's test runner needs the explicit extension here.
import { extractAdvisorId, extractAdvisorName } from "./advisor.ts";

test("extractAdvisorId prefers users with USER role", () => {
  const advisor = extractAdvisorId({
    users: [
      { role: "ADMIN", advisorMakePlansID: 11 },
      { role: "END_USER", advisorMakePlansID: 22 },
    ],
    makeplanBookingsPersonIds: [33],
  });

  assert.deepEqual(advisor, {
    advisorId: "22",
    advisorName: "",
    source: "users.user-role",
  });
});

test("extractAdvisorId falls back through all configured portal fields", () => {
  assert.deepEqual(extractAdvisorId({ users: [{ role: "ADMIN", advisorMakePlansID: "44" }] }), {
    advisorId: "44",
    advisorName: "",
    source: "users.any",
  });

  assert.deepEqual(extractAdvisorId({ makeplanBookingsPersonIds: [55] }), {
    advisorId: "55",
    advisorName: "",
    source: "makeplanBookingsPersonIds",
  });

  assert.deepEqual(
    extractAdvisorId({
      divisions: [
        { divisionType: "CHILD_COMPANY", advisorMakePlansID: 66 },
        { divisionType: "MOTHER_COMPANY", hms_contact_id: 77 },
      ],
    }),
    {
      advisorId: "77",
      advisorName: "",
      source: "divisions.mother-company",
    }
  );

  assert.deepEqual(extractAdvisorId({ advisorId: 88 }), {
    advisorId: "88",
    advisorName: "",
    source: "advisorId",
  });
});

test("extractAdvisorName reads MakePlans resource title", () => {
  assert.equal(extractAdvisorName({ resource: { title: "Ida Lund" } }), "Ida Lund");
  assert.equal(extractAdvisorName({ title: "Ola Nordmann" }), "Ola Nordmann");
  assert.equal(extractAdvisorName({ resource: {} }), null);
});

test("extractAdvisorId returns null when portal payload has no advisor fields", () => {
  assert.equal(
    extractAdvisorId({
      users: [],
      makeplanBookingsPersonIds: [],
      divisions: [{ divisionType: "MOTHER_COMPANY", advisorMakePlansID: null }],
      advisorId: null,
    }),
    null
  );
});
