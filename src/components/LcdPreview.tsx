type LcdPreviewProps = {
  line1?: string;
  line2?: string;

  size?: "small" | "large";

  label?: string;
};

function normalizeLine(
  text: string
) {
  return text
    .slice(0, 16)
    .padEnd(16, " ");
}


export default function LcdPreview({
  line1 = "",
  line2 = "",
  size = "large",
  label,
}: LcdPreviewProps) {

  const firstRow =
    normalizeLine(line1);

  const secondRow =
    normalizeLine(line2);


  function renderRow(
    text: string,
    rowName: string
  ) {
    return (
      <div
        className="lcd-character-row"
        aria-label={rowName}
      >
        {Array
          .from(text)
          .map(
            (
              character,
              index
            ) => (

              <span
                className="lcd-character-cell"
                key={index}
              >
                <span className="lcd-character">
                  {
                    character === " "
                      ? "\u00A0"
                      : character
                  }
                </span>
              </span>

            )
          )}
      </div>
    );
  }


  return (
    <div
      className={
        `nexa-lcd nexa-lcd-${size}`
      }
    >

      {label && (
        <div className="lcd-top-label">
          {label}
        </div>
      )}


      <div className="lcd-outer-bezel">

        <div className="lcd-inner-bezel">

          <div className="lcd-screen">

            <div className="lcd-screen-glow" />

            <div className="lcd-content">

              {renderRow(
                firstRow,
                "LCD row one"
              )}

              {renderRow(
                secondRow,
                "LCD row two"
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}