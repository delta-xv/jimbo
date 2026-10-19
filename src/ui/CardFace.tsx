import type { Card, Rank, Suit } from "../game/types";

const SUIT_PATHS: Record<Suit, string> = {
  hearts:
    "M6 13C4.5 11.5 0 8.1 0 4.5C0 .7 4.7 .1 6 3.6C7.3 .1 12 .7 12 4.5C12 8.1 7.5 11.5 6 13Z",
  diamonds: "M6 0L11 6.5L6 13L1 6.5Z",
  spades:
    "M6 0C4.9 2 0 5.3 0 8.1C0 11 3.7 11.5 5.1 8.7C5.1 10.5 4.4 11.8 3.5 13H8.5C7.6 11.8 6.9 10.5 6.9 8.7C8.3 11.5 12 11 12 8.1C12 5.3 7.1 2 6 0Z",
  clubs:
    "M5.3 5H6.7C6.7 9.2 6.9 11.4 8.5 13H3.5C5.1 11.4 5.3 9.2 5.3 5ZM6 0A3 3 0 1 1 6 6A3 3 0 1 1 6 0ZM2.5 4A3 3 0 1 1 2.5 10A3 3 0 1 1 2.5 4ZM9.5 4A3 3 0 1 1 9.5 10A3 3 0 1 1 9.5 4Z",
};
export function SuitIcon({ suit }: { suit: Suit }) {
  return (
    <svg
      viewBox="-1 0 14 14"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <path
        shapeRendering="geometricPrecision"
        d={SUIT_PATHS[suit]}
        fill="currentColor"
      />
    </svg>
  );
}
const rows = (ys: number[]) =>
  ys.flatMap((y) => [
    [17, y],
    [47, y],
  ]);
const PIPS: Record<string, number[][]> = {
  A: [[32, 48]],
  "2": [
    [32, 13],
    [32, 83],
  ],
  "3": [
    [32, 13],
    [32, 48],
    [32, 83],
  ],
  "4": rows([13, 83]),
  "5": [...rows([13, 83]), [32, 48]],
  "6": rows([13, 48, 83]),
  "7": [...rows([13, 48, 83]), [32, 30.5]],
  "8": [...rows([13, 48, 83]), [32, 30.5], [32, 65.5]],
  "9": [...rows([13, 36, 60, 83]), [32, 48]],
  "10": [...rows([13, 36, 60, 83]), [32, 24.5], [32, 71.5]],
};
function CourtHalf({ rank, suit }: { rank: Rank; suit: Suit }) {
  const red = suit === "hearts" || suit === "diamonds";
  const robe = red ? "#b24b42" : "#346c76";
  return (
    <g data-court-half={rank}>
      <path fill="#d4ad62" d="M5 5H59V43H5Z" />
      <path fill="#efe0b7" d="M8 8H56V40H8Z" />
      <path fill={robe} d="M9 43V35H16V30H24V28H41V31H48V35H55V43Z" />
      <path fill="#243e47" d="M24 9H40V12H44V31H38V34H23V29H20V15H24Z" />
      <path
        fill="#deb783"
        d="M25 14H38V18H41V24H38V28H34V32H27V28H24V20H22V17H25Z"
      />
      <path fill="#f4d6a3" d="M27 16H35V21H38V24H33V27H27Z" />
      <path fill="#243e47" d="M32 18H36V20H32ZM31 25H36V27H31Z" />
      {rank === "K" ? (
        <>
          <path fill="#ac753e" d="M22 6H26V10H30V5H34V10H38V6H42V15H22Z" />
          <path fill="#edc972" d="M24 7H26V12H30V6H33V12H38V7H40V13H24Z" />
          <path fill="#bf5b46" d="M30 12H34V15H30Z" />
          <path fill="#243e47" d="M24 24H28V27H36V24H39V30H36V33H28V30H24Z" />
          <path fill="#a8844b" d="M11 17H14V39H11ZM7 29H18V32H7Z" />
          <path fill="#faf0cf" d="M11 12H14V27H11Z" />
        </>
      ) : rank === "Q" ? (
        <>
          <path fill="#d4a854" d="M22 11V7H26V10H30V5H34V10H38V7H42V15H22Z" />
          <path fill="#b54d45" d="M29 10H35V14H29Z" />
          <path
            fill="#d4a854"
            d="M20 17H24V32H28V35H22V31H18V20H20ZM40 18H43V29H40Z"
          />
          <path fill="#346c62" d="M11 27H13V40H11ZM13 32H17V35H13Z" />
          <path fill="#b54d45" d="M9 21H15V24H18V28H14V31H10V28H7V24H9Z" />
          <path fill="#f1d387" d="M11 24H14V27H11Z" />
        </>
      ) : (
        <>
          <path fill={robe} d="M20 12V8H25V5H39V8H44V13H20Z" />
          <path fill="#e0b95f" d="M21 12H44V15H21Z" />
          <path fill="#f8e6b7" d="M39 10V5H43V2H47V7H43V10Z" />
          <path fill="#e0b95f" d="M12 20H15V39H12Z" />
          <path fill="#346c76" d="M11 16H16V21H11Z" />
        </>
      )}
      <path
        fill="#f1d387"
        d="M19 34H24V38H29V43H23V39H19ZM36 33H41V36H45V43H40V38H36Z"
      />
      <path fill="#243e47" d="M27 33H33V35H36V38H31V40H27V37H24V35H27Z" />
      <path fill="#f1d387" d="M48 35H52V39H48ZM12 37H16V41H12Z" />
      <g transform="translate(48 10) scale(.48)" fill="currentColor">
        <path shapeRendering="geometricPrecision" d={SUIT_PATHS[suit]} />
      </g>
    </g>
  );
}
export function CardFace({ card }: { card: Card }) {
  const court = ["J", "Q", "K"].includes(card.rank);
  return (
    <>
      <span className="card-corner">
        <b>{card.rank}</b>
        <SuitIcon suit={card.suit} />
      </span>
      {court ? (
        <svg
          className="card-court"
          viewBox="0 0 64 88"
          aria-hidden="true"
          focusable="false"
          shapeRendering="crispEdges"
        >
          <path fill="#243e47" d="M3 3H61V85H3Z" />
          <CourtHalf rank={card.rank} suit={card.suit} />
          <g transform="rotate(180 32 44)">
            <CourtHalf rank={card.rank} suit={card.suit} />
          </g>
          <path fill="#e6c883" d="M5 42H59V46H5Z" />
          <path fill="#243e47" d="M8 43H56V45H8Z" />
          <g className="court-suit-badge">
            <rect
              x="20"
              y="32"
              width="24"
              height="24"
              rx="2"
              fill="#fff7e5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <g transform="translate(25 36) scale(1.2)" fill="currentColor">
              <path
                shapeRendering="geometricPrecision"
                d={SUIT_PATHS[card.suit]}
              />
            </g>
          </g>
        </svg>
      ) : (
        <svg
          className={`card-pips ${card.rank === "A" ? "ace" : ""}`}
          viewBox="0 0 64 96"
          aria-hidden="true"
          focusable="false"
          shapeRendering="crispEdges"
        >
          {PIPS[card.rank].map(([x, y], i) => (
            <g
              key={i}
              data-pip="true"
              transform={`translate(${x} ${y}) rotate(${y > 48 ? 180 : 0}) scale(${card.rank === "A" ? 2.8 : 1.15}) translate(-6 -6.5)`}
              fill="currentColor"
            >
              <path
                shapeRendering="geometricPrecision"
                d={SUIT_PATHS[card.suit]}
              />
            </g>
          ))}
        </svg>
      )}
      <span className="card-corner lower">
        <b>{card.rank}</b>
        <SuitIcon suit={card.suit} />
      </span>
    </>
  );
}
export function cardColor(card: Card): string {
  return card.suit === "hearts" || card.suit === "diamonds" ? "red" : "black";
}
