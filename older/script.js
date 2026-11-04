const line = document.querySelector(".started");
const start = new Date(1631131287302);

function getTime() {
  let now = new Date(1748385840114);
  let elasped = now - start;
  let days = Math.floor(elasped / (1000 * 60 * 60 * 24));
  let hours = Math.floor(elasped / (1000 * 60 * 60)) - days * 24;
  let minutes = Math.floor(elasped / (1000 * 60)) - (days * 24 + hours) * 60;
  let seconds =
    Math.floor(elasped / 1000) - ((days * 24 + hours) * 60 + minutes) * 60;
  line.innerText = `Website started ${days}:${hours}:${minutes}:${seconds} ago. The website's first rendition was completed on ${now.toLocaleString(
    "en-GB",
    { timeZone: "UTC" }
  )}`;
}

setInterval(getTime, 1000);

document.querySelector(".reset").addEventListener("click", () => {
  game();
  result.innerText = "";
});

const result = document.querySelector(".result");

let ran0, ran1;
function game() {
  ran0 = Math.floor(Math.random() * 3);
  ran1 = Math.floor(Math.random() * 3);
  const coin = document.querySelector(".coin");
  coin.style.left = `${50 * ran0 + 19}px`;
  coin.style.transform = `translateY(${50 * ran1 + 10}px)`;

  const blocks = document.querySelectorAll(".block");
  blocks.forEach((block) => {
    block.style.backgroundColor = "#000000";
    block.addEventListener("click", () => {
      if (block.getAttribute("index") === ran1.toString() + ran0.toString()) {
        result.innerText = "You won!";
      } else {
        result.innerText = "You lost!";
      }

      block.style.backgroundColor = "transparent";
    });
  });
}

game();
