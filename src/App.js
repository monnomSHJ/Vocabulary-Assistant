import React, { useState, useEffect } from 'react';
import './App.css';
import { Search, Save, Book } from 'react-feather';

function App() {
  const [word, setWord] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [archive, setArchive] = useState([]);
  const [isArchiveVisible, setIsArchiveVisible] = useState(false);

  /*
  const [definition, setDefinition] = useState('');
  const [examples, setExamples] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [synonyms, setSynonyms] = useState('');
  const [antonyms, setAntonyms] = useState('');
  */

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedArchive = localStorage.getItem('vocabularyArchive');
    if (savedArchive) {
      setArchive(JSON.parse(savedArchive));
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!word) return;
    setIsLoading(true);
    setCurrentResult(null);

    /*
    setDefinition('');
    setExamples('');
    setImageUrl('');
    setSynonyms('');
    setAntonyms('');
    */

    setError('');
    setIsArchiveVisible(false);

    try {
      const responses = await Promise.all([
        fetch('http://127.0.0.1:5000/api/generate-definition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word }) }),
        fetch('http://127.0.0.1:5000/api/generate-examples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word }) }),
        fetch('http://127.0.0.1:5000/api/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word }) }),
        fetch('http://127.0.0.1:5000/api/generate-synonyms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word }) }),
        fetch('http://127.0.0.1:5000/api/generate-antonyms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word }) })
      ]);

      for (const res of responses) {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Réponse d'erreur non-JSON" }));
          throw new Error(`Erreur du serveur (${res.status}): ${errorData.error || 'Détails non disponibles'}`);
        }
      }

      const [defRes, exRes, imgRes, synRes, antRes] = responses;

      const definition = defRes.ok ? (await defRes.json()).definition : '';
      const examples = exRes.ok ? (await exRes.json()).examples : '';
      const synonyms = synRes.ok ? (await synRes.json()).synonyms : '';
      const antonyms = antRes.ok ? (await antRes.json()).antonyms : '';
      const imageUrl = imgRes.ok ? URL.createObjectURL(await imgRes.blob()) : '';

      setCurrentResult({ word, definition, examples, synonyms, antonyms, imageUrl });

    } catch (err) {
      setError(err.message || "Impossible de communiquer avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!currentResult) return;

    const isAlreadySaved = archive.some(item => item.word === currentResult.word);
    if (isAlreadySaved) {
      alert('Ce mot est déjà dans votre archive.');
      return;
    }
    
    const newArchive = [...archive, currentResult];
    setArchive(newArchive);
    localStorage.setItem('vocabularyArchive', JSON.stringify(newArchive));
    alert(`'${currentResult.word} a été sauvegardé.`);
  };

  const handleSelectFromArchive = (item) => {
    setCurrentResult(item);
    setIsArchiveVisible(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="page-header">
          <h1>L'Assistant de Vocabulaires</h1>
          <button className="archive-toggle-button" onClick={() => setIsArchiveVisible(!isArchiveVisible)}>
            <Book /> Mon Archive ({archive.length})
          </button>
        </div>

        {isArchiveVisible && (
          <div className="archive-container">
            <h2>Mon Archive</h2>
            {archive.length > 0 ? (
              <ul>
                {archive.map((item, index) => (
                  <li key={index} onClick={() => handleSelectFromArchive(item)}>
                    {item.word}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Votre archive est vide.</p>
            )}
          </div>
        )}

        <div className="upper-part">
          <form onSubmit={handleSubmit} className="search-form">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Entrez un mot français."
              disabled={isLoading}
            />
            <button type="submit" className="search-button" disabled={isLoading}>
              <Search />
            </button>
          </form>
        {currentResult && !isLoading && (
          <button onClick={handleSave} className="save-button"><Save /> Sauvegarder ce mot</button>
        )}
        {error && <div className="error-box">{error}</div>}
        </div>

        <div className="main-part">
          {isLoading && <div className="loading-indicator">LOADING...</div>}

          {currentResult && !isLoading && (
            <>
              <div className="left-part">
                <h3>Image Visuelle</h3>
                <div className="image-container">
                  {isLoading && !currentResult.imageUrl && <div className="image-placeholder">Chargement de l'artiste...</div>}
                  {currentResult.imageUrl && <img src={currentResult.imageUrl} alt={`Représentation de ${word}`} />}
                </div>
              </div>

              <div className="right-part">
                <h3>Description de Mot</h3>
                <div className="description-container">
                  <div className="response-container">
                      <h3>Définition</h3>
                      <div className="response-box"><p>{currentResult.definition}</p></div>
                  </div>
                  <div className="response-container">
                      <h3>Exemples</h3>
                      <div className="response-box"><p>{currentResult.examples}</p></div>
                  </div>
                  <div className="response-container">
                    <h3>Mots Apparentés</h3>
                    <div className="response-box">
                      {currentResult.synonyms && <p><strong>Synonymes:</strong> {currentResult.synonyms}</p>}
                      {currentResult.antonyms && <p><strong>Antonymes:</strong> {currentResult.antonyms}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;