import os
import json
import math
import re
from typing import List, Dict, Any, Tuple

class LocalVectorStore:
    def __init__(self, runbooks_file_path: str):
        self.documents: List[Dict[str, Any]] = []
        self.vocab: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.doc_vectors: List[Dict[int, float]] = []
        
        # Load runbooks database
        if os.path.exists(runbooks_file_path):
            try:
                with open(runbooks_file_path, "r") as f:
                    self.documents = json.load(f)
                self._build_index()
            except Exception as e:
                print(f"Error loading runbooks: {e}")

    def _tokenize(self, text: str) -> List[str]:
        # Normalize and split into tokens
        text = text.lower()
        # Include words and alphanumeric tags
        tokens = re.findall(r'\b[a-z0-9_-]+\b', text)
        # Filter out common stop words
        stopwords = {
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent",
            "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant",
            "cannot", "could", "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during",
            "each", "few", "for", "from", "further", "had", "hadnt", "has", "hasnt", "have", "havent", "having",
            "he", "hed", "hell", "hes", "her", "here", "heres", "hers", "herself", "him", "himself", "his", "how",
            "hows", "i", "id", "ill", "im", "ive", "if", "in", "into", "is", "isnt", "it", "its", "itself", "lets",
            "me", "more", "most", "mustnt", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
            "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan&apos;t", "she",
            "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such", "than", "that", "thats", "the",
            "their", "theirs", "them", "themselves", "then", "there", "theres", "these", "they", "theyd", "theyll",
            "theyre", "theyve", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
            "wasnt", "we", "wed", "well", "were", "weve", "werent", "what", "whats", "when", "whens", "where",
            "wheres", "which", "while", "who", "whos", "whom", "why", "whys", "with", "wont", "would", "wouldnt",
            "you", "youd", "youll", "youre", "youve", "your", "yours", "yourself", "yourselves"
        }
        return [t for t in tokens if t not in stopwords]

    def _build_index(self):
        if not self.documents:
            return

        # Count frequencies
        doc_frequency = {}
        doc_term_counts: List[Dict[str, int]] = []

        for doc in self.documents:
            # Weight tags and title heavily compared to contents
            title_text = doc.get("title", "") * 3
            tags_text = " ".join(doc.get("tags", [])) * 5
            content_text = doc.get("content", "")
            
            combined_text = f"{title_text} {tags_text} {content_text}"
            tokens = self._tokenize(combined_text)
            
            # Count terms in this document
            counts = {}
            for t in tokens:
                counts[t] = counts.get(t, 0) + 1
            doc_term_counts.append(counts)

            # Mark presence of term for IDF
            for t in counts.keys():
                doc_frequency[t] = doc_frequency.get(t, 0) + 1

        # Build vocabulary
        self.vocab = {term: idx for idx, term in enumerate(doc_frequency.keys())}
        
        # Calculate IDF
        N = len(self.documents)
        for term, freq in doc_frequency.items():
            self.idf[term] = math.log((N + 1) / (freq + 0.5)) + 1.0

        # Build TF-IDF vectors
        self.doc_vectors = []
        for counts in doc_term_counts:
            vector = {}
            # Normalize vector length
            length_sq = 0.0
            for term, count in counts.items():
                term_idx = self.vocab[term]
                tf = count
                tfidf = tf * self.idf[term]
                vector[term_idx] = tfidf
                length_sq += tfidf ** 2
            
            length = math.sqrt(length_sq)
            # Normalize
            if length > 0:
                normalized_vector = {idx: val / length for idx, val in vector.items()}
            else:
                normalized_vector = {}
            self.doc_vectors.append(normalized_vector)

    def similarity_search(self, query: str, k: int = 2) -> List[Dict[str, Any]]:
        if not self.documents or not query:
            return []

        # Tokenize query
        query_tokens = self._tokenize(query)
        query_counts = {}
        for t in query_tokens:
            if t in self.vocab:
                query_counts[t] = query_counts.get(t, 0) + 1

        # Build query TF-IDF vector
        query_vector = {}
        length_sq = 0.0
        for term, count in query_counts.items():
            term_idx = self.vocab[term]
            tf = count
            tfidf = tf * self.idf[term]
            query_vector[term_idx] = tfidf
            length_sq += tfidf ** 2
        
        query_length = math.sqrt(length_sq)
        if query_length == 0:
            # Fallback to string containment keyword match
            matches = []
            for doc in self.documents:
                score = 0.0
                content_lower = doc["content"].lower()
                title_lower = doc["title"].lower()
                for token in query_tokens:
                    if token in title_lower:
                        score += 3.0
                    elif token in content_lower:
                        score += 1.0
                if score > 0:
                    matches.append((score, doc))
            matches.sort(key=lambda x: x[0], reverse=True)
            return [doc for score, doc in matches[:k]]

        normalized_query_vector = {idx: val / query_length for idx, val in query_vector.items()}

        # Compute cosine similarity
        results: List[Tuple[float, Dict[str, Any]]] = []
        for doc_idx, doc_vector in enumerate(self.doc_vectors):
            similarity = 0.0
            for term_idx, query_val in normalized_query_vector.items():
                if term_idx in doc_vector:
                    similarity += query_val * doc_vector[term_idx]
            
            if similarity > 0:
                results.append((similarity, self.documents[doc_idx]))

        # Sort by similarity score descending
        results.sort(key=lambda x: x[0], reverse=True)
        return [doc for score, doc in results[:k]]
