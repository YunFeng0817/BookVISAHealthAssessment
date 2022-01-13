import puppeteer from "puppeteer";
import playSound from "play-sound";
import schedule from "node-schedule";
const player = playSound();

let time = 0;
/**
 * Give sound notification.
 */
function playSoundLoop() {
  player.play("./sound.mp3", function (err) {
    if (err) throw err;
    if (time < 20) {
      playSoundLoop();
      time++;
    }
  });
}

/* All available hospitals */
const TargetHospital = "Belconnen"; // name of your nearby hospital
const VisaType = "500"; // visa subclass number
const HAPID = ""; // HAP ID in your e-Medical Referral Letter
const FirstName = "";
const FamilyName = "";
const PassportID = "";
const OriginCountry = ""; // country name on your passport e.g. 'China (excludes SARs & Taiwan)'
const Birthday = ""; // DD/MM/YYYY
const Gender = "M"; // or "F"
const AddressLine1 = "";
const AddressLine2 = ""; // This is optional.
const Suburb = "";
const State = ""; // e.g. ACT NSW VIC ...
const PostCode = "";
const EmailAddress = "";
const MobileNumber = "";

const HospitalToID = {
  "Sydney BuPA": "#rbLocation168",
  Corrimal: "#rbLocation131",
  Belconnen: "#rbLocation132",
};
const targetBranchID = HospitalToID[TargetHospital];

async function check() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://bmvs.onlineappointmentscheduling.net.au/oasis/");
  await page.click("#ContentPlaceHolder1_btnInd");
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  await page.type("#ContentPlaceHolder1_SelectLocation1_txtSuburb", PostCode);
  await page.click("input[type=submit].blue-button");
  await page.waitForSelector(targetBranchID);
  await page.click(targetBranchID);
  await page.click("#ContentPlaceHolder1_btnCont");
  await page.waitForSelector("#chkClass1_489");
  await page.click("#chkClass1_489");
  await page.click("#chkClass1_492");
  await page.click("#ContentPlaceHolder1_btnCont");
  await page.waitForSelector("#ContentPlaceHolder1_SelectTime1_txtAppDate");
  await page.focus("#ContentPlaceHolder1_SelectTime1_txtAppDate");
  await page.waitForTimeout(200);
  let result: Result[] = [];
  for (let i = 0; i < 12; i++) {
    await (await page.$("#ui-datepicker-div"))!.screenshot({ captureBeyondViewport: true, path: `DatePicker${i + 1}.png` });
    result = result.concat(
      (await page.$$eval(".Highlighted", (elements) => {
        const result: Result[] = [];
        for (let element of elements) {
          const year = element.getAttribute("data-year");
          const month = element.getAttribute("data-month");
          const day = element.childNodes[0].textContent;
          result.push({ year: Number.parseInt(year!), month: Number.parseInt(month!) + 1, day: Number.parseInt(day!) });
        }
        return result;
      })) as unknown as ConcatArray<Result>
    );
    await page.click(".ui-datepicker-next.ui-corner-all");
    await page.waitForTimeout(100);
  }
  await page.click("#btnCancelConfirm");
  await page.waitForSelector(".confirmon-button--yes");
  await page.click(".confirmon-button--yes");
  await browser.close();
  if (result.length > 0) console.log(result);
  return result.length > 0;
}

/**
 * Open a visible browser to make an appointment.
 * This function won't submit the form automatically and give you a chance to check the form details.
 */
async function makeAppointment() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://bmvs.onlineappointmentscheduling.net.au/oasis/");
  await page.click("#ContentPlaceHolder1_btnInd");
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  await page.type("#ContentPlaceHolder1_SelectLocation1_txtSuburb", PostCode);
  await page.click("input[type=submit].blue-button");
  await page.waitForSelector(targetBranchID);
  await page.click(targetBranchID);
  await page.click("#ContentPlaceHolder1_btnCont");
  await page.waitForSelector("#chkClass1_489");
  await page.click("#chkClass1_489");
  await page.click("#chkClass1_492");
  await page.click("#ContentPlaceHolder1_btnCont");
  await page.waitForSelector("#ContentPlaceHolder1_SelectTime1_txtAppDate");
  await page.focus("#ContentPlaceHolder1_SelectTime1_txtAppDate");
  await page.waitForTimeout(200);
  const times = await page.$$("input[name='ctl00$ContentPlaceHolder1$SelectTime1$rblResults']");
  if (times.length > 0) {
    await page.click(`#ContentPlaceHolder1_SelectTime1_rblResults_${times.length - 1}`);
    await page.waitForSelector("#ContentPlaceHolder1_SelectTime1_spnSelDateTime");
    const time = await page.$eval("#ContentPlaceHolder1_SelectTime1_spnSelDateTime", (element) => element.textContent);
    console.log("Found a time on " + time);
    await page.click("#ContentPlaceHolder1_btnCont");
    await page.waitForSelector("#ContentPlaceHolder1_ddlVisaSubClass");

    /* Start to fill details of appointment. */
    await page.$eval("#ContentPlaceHolder1_ddlVisaSubClass", (element, visaType: string) => ((element as HTMLSelectElement).value = visaType), VisaType);
    await page.type("#ContentPlaceHolder1_txtHAPID", HAPID);
    await page.type("#ContentPlaceHolder1_txtHAPID2", HAPID); // confirm HAP ID
    await page.type("#ContentPlaceHolder1_txtFirstName", FirstName);
    await page.type("#ContentPlaceHolder1_txtSurname", FamilyName);
    await page.type("#ContentPlaceHolder1_txtPassportNo", PassportID);
    await page.$eval("#ContentPlaceHolder1_ddlPassportCountry", (element, country: string) => ((element as HTMLSelectElement).value = country), OriginCountry);
    await page.type("#ContentPlaceHolder1_txtDOB", Birthday);
    await page.$eval("#ContentPlaceHolder1_ddlGender", (element, gender: string) => ((element as HTMLSelectElement).value = gender), Gender);
    await page.type("#ContentPlaceHolder1_txtAddress1", AddressLine1);
    await page.type("#ContentPlaceHolder1_txtAddress2", AddressLine2);
    await page.type("#ContentPlaceHolder1_txtSuburb", Suburb);
    await page.$eval("#ContentPlaceHolder1_ddlState", (element, state: string) => ((element as HTMLSelectElement).value = state), State);
    await page.type("#ContentPlaceHolder1_txtPostCode", PostCode);
    await page.type("#ContentPlaceHolder1_txtEmail", EmailAddress);
    await page.type("#ContentPlaceHolder1_txtEmail2", EmailAddress); // confirm email address
    await page.type("#ContentPlaceHolder1_txtMobile", MobileNumber); // mobile phone number
    await page.click("#ContentPlaceHolder1_btnSaveChanges"); // save changes
    return true;
  }
}

type Result = {
  year: number;
  month: number;
  day: number;
};

// Execute the check task every 5 min.
schedule.scheduleJob("*/5 * * * *", async () => {
  if (await check()) {
    // If the hospital has available locations, open a visible browser to make an appointment.
    // This script won't submit the form automatically and give you a chance to check the form details.
    makeAppointment();
    playSoundLoop();
  } else console.log(`Executed the check task at ${new Date()} and no location was found.`);
});
