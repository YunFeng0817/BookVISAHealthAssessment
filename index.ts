import puppeteer from "puppeteer";
import playSound from "play-sound";
import schedule from "node-schedule";
const player = playSound();

let time = 0;
function playSoundLoop() {
  player.play("./sound.mp3", function (err) {
    if (err) throw err;
    if (time < 20) {
      playSoundLoop();
      time++;
    }
  });
}

async function check() {
  const browser = await puppeteer.launch({
    ignoreDefaultArgs: ["--mute-audio", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.goto("https://bmvs.onlineappointmentscheduling.net.au/oasis/");
  await page.click("#ContentPlaceHolder1_btnInd");
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  await page.type("#ContentPlaceHolder1_SelectLocation1_txtSuburb", "2914");
  await page.click("input[type=submit].blue-button");
  const targetRadioID = "#rbLocation132"; // Belconnen
  // const targetRadioID = "#rbLocation168"; // Sydney
  await page.waitForSelector(targetRadioID);
  await page.click(targetRadioID);
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
          result.push({ year: Number.parseInt(year), month: Number.parseInt(month) + 1, day: Number.parseInt(day) });
        }
        return result;
      })) as unknown as ConcatArray<Result>
    );
    await page.click(".ui-datepicker-next.ui-corner-all");
    await page.waitForTimeout(100);
  }
  await browser.close();
  if (result.length > 0) console.log(result);
  return result.length > 0;
}

type Result = {
  year: number;
  month: number;
  day: number;
};

schedule.scheduleJob("*/5 * * * *", async () => {
  if (await check()) {
    playSoundLoop();
  } else console.log(`Executed the check task at ${new Date()} and no location was found.`);
});
