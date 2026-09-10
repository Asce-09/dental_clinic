import { useEffect, useState } from 'react';
import client from '../api/client';

export default function PatientPicker({ label = 'Patient *', onSelect, required = true }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      client.get('/patients', { params: { search: query, limit: 8 } }).then((res) => setResults(res.data.data));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function handleSelect(p) {
    setSelected(p);
    setQuery(`${p.first_name} ${p.last_name}`);
    setShowSuggestions(false);
    onSelect(p);
  }

  return (
    <div className="field autocomplete-field">
      <label>{label}</label>
      <input
        type="text"
        placeholder="Search patient by name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          onSelect(null);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        autoComplete="off"
        required={required}
      />
      {showSuggestions && query.trim() && (
        <div className="autocomplete-list">
          {results.length === 0 && (
            <div className="autocomplete-empty">No patients match "{query}"</div>
          )}
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              className="autocomplete-item"
              onClick={() => handleSelect(p)}
            >
              <span>{p.first_name} {p.last_name}</span>
              <span className="autocomplete-meta">{p.patient_code}</span>
            </button>
          ))}
        </div>
      )}
      {selected && <div className="selected-chip">Selected: {selected.first_name} {selected.last_name}</div>}
    </div>
  );
}
