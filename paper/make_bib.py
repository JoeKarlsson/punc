"""Write references.bib from citation_map.json: BibTeX from doi.org for sources with a DOI,
hand-checked entries for the rest. Keys are the citation map's keys.

Usage: python3 make_bib.py citation_map.json references.bib
"""
import html
import json
import re
import sys
import urllib.request

# Sources without a DOI. Publication facts are from the title pages at the URLs in
# citation_map.json or the publishers' catalogs.
BY_HAND = {
    "Sherman1893": """@book{Sherman1893,
  author = {Sherman, L. A.}, title = {Analytics of Literature: A Manual for the Objective Study of English Prose and Poetry},
  publisher = {Ginn \\& Company}, address = {Boston}, year = {1893}, url = {https://archive.org/details/analyticsofliter00sheruoft}}""",
    "Lewis1894": """@book{Lewis1894,
  author = {Lewis, Edwin Herbert}, title = {The History of the English Paragraph},
  publisher = {University of Chicago Press}, address = {Chicago}, year = {1894},
  url = {https://archive.org/details/historyenglishp00lewigoog}}""",
    "Smith1776": """@book{Smith1776,
  author = {Smith, Adam}, title = {An Inquiry into the Nature and Causes of the Wealth of Nations},
  publisher = {{W. Strahan and T. Cadell}}, address = {London}, year = {1776},
  url = {https://archive.org/details/inquiryintonatur02smit_0}}""",
    "Greg1950": """@article{Greg1950,
  author = {Greg, W. W.}, title = {The Rationale of Copy-Text}, journal = {Studies in Bibliography},
  volume = {3}, pages = {19--36}, year = {1950}}""",
    "Hunt1965": """@book{Hunt1965,
  author = {Hunt, Kellogg W.}, title = {Grammatical Structures Written at Three Grade Levels},
  series = {NCTE Research Report}, number = {3}, publisher = {National Council of Teachers of English},
  address = {Champaign, IL}, year = {1965}}""",
    "Nunberg1990": """@book{Nunberg1990,
  author = {Nunberg, Geoffrey}, title = {The Linguistics of Punctuation}, series = {CSLI Lecture Notes},
  number = {18}, publisher = {{Center for the Study of Language and Information}}, address = {Stanford, CA}, year = {1990}}""",
    "Parkes1992": """@book{Parkes1992,
  author = {Parkes, M. B.}, title = {Pause and Effect: An Introduction to the History of Punctuation in the West},
  publisher = {Scolar Press}, address = {Aldershot}, year = {1992}}""",
    "Watson2019": """@book{Watson2019,
  author = {Watson, Cecelia}, title = {Semicolon: The Past, Present, and Future of a Misunderstood Mark},
  publisher = {Ecco}, address = {New York}, year = {2019}}""",
    "Oliver2025": """@online{Oliver2025,
  author = {Oliver, Henry}, title = {The Triumph of Logical English}, organization = {Works in Progress},
  year = {2025}, url = {https://worksinprogress.co/issue/the-logical-triumph-of-english/}, urldate = {2026-11-21}}""",
    "Liberman2022": """@unpublished{Liberman2022,
  author = {Liberman, Mark}, title = {Historical Trends in English Sentence Length and Syntactic Complexity},
  note = {Talk at the 12th International Conference on Studies in the History of the English Language (SHEL 12)},
  year = {2022}, url = {https://languagelog.ldc.upenn.edu/myl/LibermanSHEL12.pdf}, urldate = {2026-11-22}}""",
    "Tornberg2023": """@online{Tornberg2023,
  author = {Törnberg, Petter}, title = {{ChatGPT-4} Outperforms Experts and Crowd Workers in Annotating Political {Twitter} Messages with Zero-Shot Learning},
  organization = {arXiv}, year = {2023}, doi = {10.48550/arXiv.2304.06588}}""",
    "Domain2026": """@online{Domain2026,
  author = {{Duke Center for the Study of the Public Domain}}, title = {Public Domain Day 2026},
  year = {2026}, url = {https://cspd.law.duke.edu/publicdomainday/2026}, urldate = {2026-11-21}}""",
}


# Crossref records with a wrong field: OCR in a name, a start page without the end page.
FIXES = {"BRUTHlAUX": "Bruthiaux", "pages={843}": "pages={843--861}"}


def from_doi(key, doi):
    request = urllib.request.Request(f"https://doi.org/{doi}", headers={"Accept": "application/x-bibtex"})
    entry = html.unescape(urllib.request.urlopen(request, timeout=30).read().decode().strip())
    for wrong, right in FIXES.items():
        entry = entry.replace(wrong, right)
    entry = re.sub(r"^@(\w+)\{[^,]*,", lambda m: f"@{m.group(1)}{{{key},", entry, count=1)
    entry = re.sub(r" url=\{[^}]*\},", "", entry)  # the DOI is the link
    entry = entry.replace(" & ", r" \& ")
    # Some publishers register surnames in capitals (DARMON, ALEXANDRA N. M.).
    return re.sub(r"author=\{([^}]*)\}",
                  lambda m: "author={" + re.sub(r"\b[A-Z]{2,}\b", lambda w: w.group(0).title(), m.group(1)) + "}",
                  entry)


def fallback(key, source):
    # Uncited web sources: enough for citeproc if a later draft cites one.
    authors = " and ".join(source["authors"])
    url = f", url = {{{source['url']}}}" if source.get("url") else ""
    return f"@misc{{{key}, author = {{{authors}}}, title = {{{source['title']}}}, year = {{{source['year']}}}{url}}}"


map_path, out_path = sys.argv[1:3]
entries = []
for key, source in json.load(open(map_path)).items():
    if key in BY_HAND:
        entries.append(BY_HAND[key])
    elif source.get("doi"):
        entries.append(from_doi(key, source["doi"]))
    else:
        entries.append(fallback(key, source))
open(out_path, "w").write("\n\n".join(entries) + "\n")
print(f"{len(entries)} entries")
