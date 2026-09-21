// Shared tooth-grid used by the staff chart and the patient-portal chart.
// Shows adult (permanent) teeth, baby (primary) teeth, or both (mixed
// dentition) depending on `dentition`.

const PERMANENT = {
  upperRight: ['18', '17', '16', '15', '14', '13', '12', '11'],
  upperLeft: ['21', '22', '23', '24', '25', '26', '27', '28'],
  lowerRight: ['48', '47', '46', '45', '44', '43', '42', '41'],
  lowerLeft: ['31', '32', '33', '34', '35', '36', '37', '38'],
};

const PRIMARY = {
  upperRight: ['55', '54', '53', '52', '51'],
  upperLeft: ['61', '62', '63', '64', '65'],
  lowerRight: ['85', '84', '83', '82', '81'],
  lowerLeft: ['71', '72', '73', '74', '75'],
};

export const DENTITION_INFO = {
  primary: {
    label: 'Primary (baby) teeth',
    detail: '20 teeth · typically ages 0–5',
  },
  mixed: {
    label: 'Mixed dentition',
    detail: 'Baby and permanent teeth together · typically ages 6–12',
  },
  permanent: {
    label: 'Permanent (adult) teeth',
    detail: '32 teeth · typically ages 13 and up',
  },
};

function ToothRow({ numbers, byNumber, selectedNumber, onSelect, small }) {
  return (
    <div className="tooth-row">
      {numbers.map((num) => {
        const status = byNumber[num]?.status || 'healthy';
        const isSelected = selectedNumber === num;
        return (
          <button
            key={num}
            className={`tooth tooth-${status}${small ? ' tooth-primary' : ''}${isSelected ? ' tooth-selected' : ''}`}
            onClick={() => onSelect(num)}
            title={`Tooth ${num} — ${status.replace('_', ' ')}`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

function Quadrants({ left, right, small, ...rest }) {
  return (
    <div className={`chart-quadrants${small ? ' chart-quadrants-primary' : ''}`}>
      <ToothRow numbers={left} small={small} {...rest} />
      <ToothRow numbers={right} small={small} {...rest} />
    </div>
  );
}

export default function ToothGrid({ dentition, byNumber, selectedNumber, onSelect }) {
  const common = { byNumber, selectedNumber, onSelect };
  const showPermanent = dentition !== 'primary';
  const showPrimary = dentition !== 'permanent';
  const mixed = dentition === 'mixed';

  return (
    <div className="chart-grid">
      {mixed && <div className="chart-group-label">Permanent teeth</div>}
      {showPermanent && (
        <Quadrants left={PERMANENT.upperRight} right={PERMANENT.upperLeft} {...common} />
      )}
      {mixed && <div className="chart-group-label">Primary teeth</div>}
      {showPrimary && (
        <Quadrants left={PRIMARY.upperRight} right={PRIMARY.upperLeft} small {...common} />
      )}

      <div className="chart-midline" />

      {showPrimary && (
        <Quadrants left={PRIMARY.lowerRight} right={PRIMARY.lowerLeft} small {...common} />
      )}
      {showPermanent && (
        <Quadrants left={PERMANENT.lowerRight} right={PERMANENT.lowerLeft} {...common} />
      )}
    </div>
  );
}
