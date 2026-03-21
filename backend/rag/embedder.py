"""
Embedder: Uses Ollama nomic-embed-text to embed all schemes at startup,
then does cosine similarity search at query time.
Falls back to TF-IDF if Ollama is not available.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import ollama

DATA_PATH = Path(__file__).parent.parent / "data.json"

_schemes: List[Dict[str, Any]] = []
_scheme_texts: List[str] = []
_embeddings: np.ndarray | None = None




def _ollama_embed_batch(texts: List[str]) -> np.ndarray:
    """Call Ollama Embedding API for a list of texts. Returns an (N, D) float32 array."""
    vectors = []
    for text in texts:
        try:
            response = ollama.embeddings(model="nomic-embed-text", prompt=text)
            vectors.append(response["embedding"])
        except Exception as e:
            print(f"[Embedder] Ollama embedding error for text: {e}")
            # If one fails, we might want to fail the whole batch or use a zero vector
            raise e

    arr = np.array(vectors, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-10
    return arr / norms


def _ollama_embed_query(text: str) -> np.ndarray:
    response = ollama.embeddings(model="nomic-embed-text", prompt=text)
    vec = np.array(response["embedding"], dtype=np.float32)
    norm = np.linalg.norm(vec) + 1e-10
    return vec / norm


_tfidf_matrix: np.ndarray | None = None
_tfidf_vocab: Dict[str, int] = {}


def _build_tfidf_matrix(texts: List[str]):
    from math import log

    tokenised = [t.lower().split() for t in texts]
    df: Dict[str, int] = {}
    for tokens in tokenised:
        for tok in set(tokens):
            df[tok] = df.get(tok, 0) + 1

    N = len(texts)
    vocab = list(df.keys())
    vocab_idx = {w: i for i, w in enumerate(vocab)}

    matrix = np.zeros((N, len(vocab)), dtype=np.float32)
    for doc_i, words in enumerate(tokenised):
        tf: Dict[str, float] = {}
        for w in words:
            tf[w] = tf.get(w, 0) + 1
        for w, cnt in tf.items():
            if w in vocab_idx:
                idf = log(N / (df[w] + 1)) + 1
                matrix[doc_i, vocab_idx[w]] = (cnt / len(words)) * idf

    norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10
    return matrix / norms, vocab_idx


def _tfidf_query_vec(query: str) -> np.ndarray:
    words = query.lower().split()
    vec = np.zeros(len(_tfidf_vocab), dtype=np.float32)
    for w in words:
        if w in _tfidf_vocab:
            vec[_tfidf_vocab[w]] += 1.0
    norm = np.linalg.norm(vec) + 1e-10
    return vec / norm


def _build_scheme_text(scheme: Dict[str, Any]) -> str:
    docs = ", ".join(scheme.get("documents_required", []))
    links = ", ".join(scheme.get("where_to_apply_links", []))
    return (
        f"Scheme: {scheme['name']}. "
        f"Category: {scheme.get('category', '')}. "
        f"Purpose: {scheme.get('purpose', '')}. "
        f"Eligibility: {scheme.get('eligibility', '')}. "
        f"Coverage/Risks: {scheme.get('coverage_risks', '')}. "
        f"Mandatory Requirements: {scheme.get('mandatory_requirements', '')}. "
        f"Documents: {docs}. Apply at: {links}."
    )


_use_ollama = False


def initialise():
    global _schemes, _scheme_texts, _embeddings, _tfidf_matrix, _tfidf_vocab, _use_ollama

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    _schemes = data["schemes"]
    _scheme_texts = [_build_scheme_text(s) for s in _schemes]

    try:
        print(f"[Embedder] Using Ollama nomic-embed-text to embed {len(_schemes)} schemes...")
        _embeddings = _ollama_embed_batch(_scheme_texts)
        _use_ollama = True
        print("[Embedder] Ollama embeddings ready ✓")
    except Exception as e:
        print(f"[Embedder] Ollama embedding failed ({e}). Falling back to TF-IDF.")
        _tfidf_matrix, _tfidf_vocab = _build_tfidf_matrix(_scheme_texts)


def retrieve(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    if not _schemes:
        initialise()

    if _use_ollama and _embeddings is not None:
        query_vec = _ollama_embed_query(query)
        scores = _embeddings @ query_vec
    elif _tfidf_matrix is not None:
        query_vec = _tfidf_query_vec(query)
        scores = _tfidf_matrix @ query_vec
    else:
        raise RuntimeError("Embedder not initialised. Call initialise() first.")

    top_indices = np.argsort(scores)[::-1][:top_k]
    results = []
    for idx in top_indices:
        scheme = dict(_schemes[idx])
        scheme["_score"] = float(scores[idx])
        results.append(scheme)
    return results
