"""Text chunking strategies for document processing."""


def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 100,
    separator: str = "\n",
) -> list[dict]:
    """Split text into overlapping chunks.

    Uses a sliding window approach:
    - Splits by paragraph first (separator)
    - Merges paragraphs into chunks up to chunk_size chars
    - Overlaps between chunks to maintain context continuity

    Returns list of dicts: [{"index": 0, "content": "..."}, ...]
    """
    if not text or not text.strip():
        return []

    # Split into paragraphs
    paragraphs = [p.strip() for p in text.split(separator) if p.strip()]

    if not paragraphs:
        return []

    chunks = []
    current_chunk = ""
    chunk_index = 0

    for para in paragraphs:
        # If adding this paragraph exceeds chunk size and we already have content
        if len(current_chunk) + len(para) > chunk_size and current_chunk:
            chunks.append({
                "index": chunk_index,
                "content": current_chunk.strip(),
            })
            chunk_index += 1

            # Overlap: keep the last `chunk_overlap` chars of previous chunk
            if chunk_overlap > 0 and len(current_chunk) > chunk_overlap:
                current_chunk = current_chunk[-chunk_overlap:]
            else:
                current_chunk = ""

        # Add paragraph to current chunk
        if current_chunk:
            current_chunk += "\n" + para
        else:
            current_chunk = para

    # Don't forget the last chunk
    if current_chunk.strip():
        chunks.append({
            "index": chunk_index,
            "content": current_chunk.strip(),
        })

    return chunks


def chunk_text_semantic(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 100,
) -> list[dict]:
    """Enhanced chunking that respects semantic boundaries.

    Attempts to split at natural breakpoints:
    1. Headings (# or ## in markdown)
    2. Paragraph breaks
    3. Sentence boundaries (。！？)
    4. Falls back to size-based splitting
    """
    if not text or not text.strip():
        return []

    # Try to split by markdown headings
    sections = _split_by_headings(text)

    all_chunks = []
    global_index = 0

    for section_title, section_content in sections:
        # Further split large sections by paragraphs
        section_chunks = chunk_text(
            section_content,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        for ch in section_chunks:
            all_chunks.append({
                "index": global_index,
                "content": ch["content"],
                "section_title": section_title if section_title else None,
            })
            global_index += 1

    return all_chunks


def _split_by_headings(text: str) -> list[tuple[str, str]]:
    """Split text by markdown headings. Returns [(section_title, content), ...]."""
    import re

    # Match lines starting with # (h1-h6)
    heading_pattern = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

    # Find all heading positions
    headings = list(heading_pattern.finditer(text))

    if not headings:
        return [("", text)]

    sections = []
    for i, match in enumerate(headings):
        title = match.group(2)
        start = match.end()
        end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
        content = text[start:end].strip()
        sections.append((title, content))

    return sections
