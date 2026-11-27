import assert from "node:assert/strict";

export async function checkStaffFarewells(browser, url, output) {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${url}?staff-farewell`);
  await page.waitForFunction(() => window.seedStaffFixture && window.staffScene);
  await page.evaluate(() => window.seedStaffFixture());
  await page.waitForFunction(() => window.staffScene.getObjectByName("StaffMember-guard"));
  await page.evaluate(() => {
    window.hud.getState().setSheet(null);
    const data = structuredClone(window.staff.getState().data);
    data.staff.forEach((e) => {
      e.status = "left";
      e.amountDue = 0;
      e.lateDays = 3;
    });
    data.messages = [101, 100].map((id) => ({
      id,
      type: "STAFF_LEFT",
      kind: id === 100 ? "guard" : "courier",
      name: id === 100 ? "Penjaga warung" : "Kurir kulakan",
      at: new Date().toISOString(),
      text: "Gaji belum dibayar 3 hari. Saya pamit dulu, ya.",
    }));
    window.departedStaff = data;
    window.staffTransport = async () => structuredClone(window.departedStaff);
    window.staff.setState({ data });
  });
  await page.waitForFunction(() => window.staffScene.getObjectByName("StaffFarewell-100"));
  assert.equal(
    await page.evaluate(() => !!window.staffScene.getObjectByName("StaffFarewell-101")),
    false,
  );
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${output}/staff-farewell-guard.png` });
  await page.waitForFunction(
    () => window.staffScene.getObjectByName("StaffFarewell-100")?.position.z > 5,
    null,
    { timeout: 8000 },
  );
  await page.waitForFunction(() => window.staffScene.getObjectByName("StaffFarewell-101"), null, {
    timeout: 12000,
  });
  assert.equal(
    await page.evaluate(() => !!window.staffScene.getObjectByName("StaffFarewell-100")),
    false,
  );
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${output}/staff-farewell-courier.png` });
  await page.waitForFunction(
    () => localStorage.getItem("tc-staff-farewell-seen:qa-staff") === "101",
    null,
    { timeout: 12000 },
  );
  assert.equal(
    await page.evaluate(() => !!window.staffScene.getObjectByName("StaffFarewell-101")),
    false,
  );

  // A different account's older journal ID must still play, then stop immediately if rehired.
  await page.evaluate(() => {
    window.staffAccount.setState({ user: { id: "qa-other-staff" } });
    window.departedStaff.messages = [90, 91].map((id) => ({
      ...window.departedStaff.messages[1],
      id,
    }));
    window.staff.setState({ data: structuredClone(window.departedStaff) });
  });
  await page.waitForFunction(() => window.staffScene.getObjectByName("StaffFarewell-91"));
  assert.equal(
    await page.evaluate(() => !!window.staffScene.getObjectByName("StaffFarewell-90")),
    false,
    "a previous employment's goodbye must not replay",
  );
  await page.evaluate(() => {
    window.departedStaff.staff[0].status = "active";
    window.staff.setState({ data: structuredClone(window.departedStaff) });
  });
  await page.waitForFunction(() => window.staffScene.getObjectByName("StaffMember-guard"));
  assert.equal(
    await page.evaluate(() => !!window.staffScene.getObjectByName("StaffFarewell-91")),
    false,
  );

  // Reloading must not replay completed departures for the original account.
  await page.reload();
  await page.waitForFunction(() => window.seedStaffFixture && window.staffScene);
  await page.evaluate(() => window.seedStaffFixture());
  await page.waitForFunction(() => window.staffScene.getObjectByName("StaffMember-guard"));
  await page.evaluate(() => {
    const data = structuredClone(window.staff.getState().data);
    data.staff.forEach((e) => {
      e.status = "left";
    });
    data.messages = [101, 100].map((id) => ({
      id,
      kind: id === 100 ? "guard" : "courier",
      type: "STAFF_LEFT",
      at: new Date().toISOString(),
      text: "Pamit",
    }));
    window.staffTransport = async () => structuredClone(data);
    window.staff.setState({ data });
  });
  await page.waitForFunction(() => !window.staffScene.getObjectByName("StaffMember-guard"));
  assert.equal(
    await page.evaluate(() => window.staffScene.children.some((g) => g.name === "ShopStaff-porch")),
    false,
  );
  assert.deepEqual(errors, []);
  await page.close();
}
