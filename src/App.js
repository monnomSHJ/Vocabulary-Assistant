import React, { useState, useEffect } from 'react';
import './App.css';
import { Search, Save, Book, Star, Trash2 } from 'react-feather';

function App() {
  const [word, setWord] = useState('');
  const [context, setContext] = useState('');
  const [meanings, setMeanings] = useState([])
  const [selectedMeaning, setSelectedMeaning] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const [archive, setArchive] = useState([]);
  const [isArchiveVisible, setIsArchiveVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedArchive = localStorage.getItem('vocabularyArchive');
    if (savedArchive) {
      setArchive(JSON.parse(savedArchive));
    }
  }, []);


  /* Step 1. Get a list of the meanings */
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!word) {
      setError("Il faut entrer un mot.");
      return;
    }
    
    setIsLoading(true);
    setCurrentResult(null);
    setError('');
    setIsArchiveVisible(false);
    setMeanings([]);
    setSelectedMeaning(null);

    try {
      if (context.trim() !== '') {
        const response = await fetch('http://127.0.0.1:5000/api/get-meaning-from-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word, sentence: context }) })
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }
        const data = await response.json();
        fetchDetails(data.meaning);

      } else {
        const response = await fetch('http://127.0.0.1:5000/api/get-meanings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word }) })

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        const data = await response.json();

        if (data.meanings && data.meanings.length > 1) {
          setMeanings(data.meanings);
          setIsLoading(false);
        } else {
          fetchDetails(word)
        }
      }

    } catch (err) {
      setError(err.message || "Impossible de communiquer avec le serveur.");
      setIsLoading(false);
    }
  };

  const fetchDetails = async (meaning) => {
    setSelectedMeaning(meaning);
    setIsLoading(true);
    setMeanings([]);

    try {
      const responses = await Promise.all([
        fetch('http://127.0.0.1:5000/api/generate-definition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word : meaning }) }),
        fetch('http://127.0.0.1:5000/api/generate-examples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word : meaning }) }),
        fetch('http://127.0.0.1:5000/api/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word : meaning }) }),
        fetch('http://127.0.0.1:5000/api/generate-synonyms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word : meaning }) }),
        fetch('http://127.0.0.1:5000/api/generate-antonyms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word : meaning }) }),
      ]);

      const errorResponse = responses.find(res => !res.ok);
      if (errorResponse) {
        const errorData = await errorResponse.json();
        throw new Error(errorData.error || `Erreur du serveur (${errorResponse.status})`);
      }

      const [defRes, exRes, imgRes, synRes, antRes] = responses;

      const definitionData = await defRes.json();
      const examplesData = await exRes.json();
      const synonymsData = await synRes.json();
      const antonymsData = await antRes.json();

      const imageData = await imgRes.blob();
      const imageUrlPromise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageData);
      })

      const imageUrl = await imageUrlPromise;

      setCurrentResult({
        word: meaning,
        definition: definitionData.definition,
        examples: examplesData.examples,
        imageUrl: imageUrl,
        synonyms: synonymsData.synonyms,
        antonyms: antonymsData.antonyms
      });

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
    
    const newArchive = [...archive, { ...currentResult, pinned: false }];
    setArchive(newArchive);
    localStorage.setItem('vocabularyArchive', JSON.stringify(newArchive));
    alert(`'${currentResult.word} a été sauvegardé.`);
  };

  const handleSelectFromArchive = (item) => {
    setCurrentResult(item);
    setIsArchiveVisible(false);
  };

  const handleTogglePin = (indexToToggle) => {
    const newArchive = [...archive];
    newArchive[indexToToggle].pinned = !newArchive[indexToToggle].pinned;
    newArchive.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    setArchive(newArchive);
    localStorage.setItem('vocabularyArchive', JSON.stringify(newArchive))
  };

  const handleDelete = (indexToDelete) => {
    const newArchive = archive.filter((_, index) => index !== indexToDelete);
    setArchive(newArchive);
    localStorage.setItem('vocabularyArchive', JSON.stringify(newArchive));
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="page-header">
          <h1>L'Assistant de Vocabulaires</h1>
          <button className={`archive-toggle-button ${isArchiveVisible ? 'active' : ''}`}
          onClick={() => setIsArchiveVisible(!isArchiveVisible)}>
            <Book /> Mon Archive ({archive.length})
          </button>
        </div>

        <div className="page-body">
          {isArchiveVisible && (
            <div className="archive-container">
              <div className="archive-container-header">
                <h2>Mon Archive</h2>
              </div>
              {archive.length > 0 ? (
                <div className="archive-list">
                  {archive.map((item, index) => (
                    <div key={index} className="archive-item">
                      <span className="archive-item-word" onClick={() => handleSelectFromArchive(item)}>
                        {item.word}
                      </span>
                      <div className="archive-item-actions">
                        <button
                          onClick={() => handleTogglePin(index)}
                          className={item.pinned ? 'pinned' : ''}
                          title="Épingler en haut"
                        >
                          <Star size={18} />
                        </button>
                        <button onClick={() => handleDelete(index)} title="Supprimer">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Votre archive est vide.</p>
              )}
            </div>
          )}

          <div className="upper-part">
            <form onSubmit={handleSubmit} className="search-form">
              <input
                type="text"
                className="word-input"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Entrez un mot français."
                disabled={isLoading}
              />
              <input
                type="text"
                className="context-input"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder = "Opionnel : entrez la phrase où vous avez trouvé le mot."
                disabled={isLoading}
              />
              <button type="submit" className="search-button" disabled={isLoading}>
                <Search size={24} />
              </button>
            </form>
          {currentResult && !isLoading && (
            <button onClick={handleSave} className="save-button"><Save /> Sauvegarder ce mot</button>
          )}
          </div>

          {error && <div className="error-box">{error}</div>}

          {meanings.length > 1 && (
            <div className = "meanings-container">
              <h4>Plusieurs sens ont été trouvés pour "{word}". Lequel voulez-vous consulter ?</h4>
              <div className = "meaning-list">
                {meanings.map((meaning, index) => (
                  <button key={index} onClick={() => fetchDetails(meaning)} className="meaning-button">
                    {meaning}
                  </button>
                ))}
                <button onClick={() => fetchDetails(word)} className="meaning-button-unknown">
                    Je ne sais pas !
                </button>
              </div>
            </div>
          )}

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
        </div>
      </header>
    </div>
  );
}

export default App;