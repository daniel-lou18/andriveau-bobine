#!/usr/bin/env python3
"""Build bobine 8 interchange JSON from manual row tables (vision-assisted)."""
from __future__ import annotations

import json
from typing import Any


def rec(
    idx: int,
    pdf_page: int,
    ilots: list[int],
    raw_text: str,
    rtype: str,
    libelle: str,
    numeros_raw: str,
    *,
    inferred: bool = False,
    low_confidence: bool = False,
    scan_note: str | None = None,
    page: int | None = None,
) -> dict[str, Any]:
    rue: dict[str, Any] = {"type": rtype, "libelle": libelle}
    if inferred:
        rue["inferred"] = True
    o: dict[str, Any] = {
        "reading_order_index": idx,
        "pdf_page": pdf_page,
        "ilot_numbers": ilots,
        "raw_text": raw_text,
        "rue": rue,
        "numeros_raw": numeros_raw,
    }
    if page is not None:
        o["page"] = page
    if low_confidence:
        o["low_confidence"] = True
    if scan_note:
        o["scan_note"] = scan_note
    return o


def main() -> None:
    rows: list[dict[str, Any]] = []
    i = 0

    def add(
        pdf_page: int,
        ilots: list[int],
        street_display: str,
        rtype: str,
        libelle: str,
        numeros_raw: str,
        **kw: Any,
    ) -> None:
        nonlocal i
        ilot_s = ",".join(str(x) for x in ilots)
        raw = f"Ilot {ilot_s} | {street_display} | {numeros_raw}"
        rows.append(
            rec(
                i,
                pdf_page,
                ilots,
                raw,
                rtype,
                libelle,
                numeros_raw,
                **kw,
            )
        )
        i += 1

    # --- Page 1 (left stream then right stream) ---
    p = 1
    add(p, [818], "Rue Madame", "rue", "Madame", "8 -> 10")
    add(p, [818], "Rue de Rennes", "rue", "de Rennes", "65")
    add(p, [818], "Rue Madame", "rue", "Madame", "10")
    add(p, [818], "Rue de Rennes", "rue", "de Rennes", "65")
    add(p, [818], "Rue du Vieux-Colombier", "rue", "du Vieux-Colombier", "10/12")
    add(p, [818], "Rue de Rennes", "rue", "de Rennes", "65, 57 -> 63")
    add(p, [819], "Rue du Vieux-Colombier", "rue", "du Vieux-Colombier", "9 -> 13")
    add(p, [819], "Rue Cassette", "rue", "Cassette", "1")
    add(p, [819], "Rue de Rennes", "rue", "de Rennes", "69 -> 71")
    add(p, [820], "Rue Pape Carpentier", "rue", "Pape Carpentier", "5")
    add(p, [820], "Rue Mézières", "rue", "Mézières", "6 -> 10")
    add(p, [820, 821], "Rue Cassette", "rue", "Cassette", "5 -> 7 / 6")
    add(p, [820, 821], "Rue de Rennes", "rue", "de Rennes", "73 -> 79")
    add(p, [821, 822], "Rue Mézières", "rue", "Mézières", "7 -> 9")
    add(p, [821, 822], "Rue Madame", "rue", "Madame", "28 -> 38")
    add(p, [821, 822], "Rue Honoré Chevalier", "rue", "Honoré Chevalier", "10")
    add(p, [821, 822], "Rue Cassette", "rue", "Cassette", "11 -> 21")
    add(p, [823], "Rue Mézières", "rue", "Mézières", "13 -> 15")
    add(p, [823], "Rue de Rennes", "rue", "de Rennes", "81")
    add(p, [823], "Rue Mézières", "rue", "Mézières", "15")
    add(p, [823], "Rue Cassette", "rue", "Cassette", "10 -> 22")
    add(
        p,
        [822, 823],
        "Rue Cassette",
        "rue",
        "Cassette",
        "13, 10, 18 -> 26, 32",
        scan_note="PAGE cell listed îlots 822,823 with repeats; distinct order preserved",
    )

    add(p, [823], "Rue de Vaugirard", "rue", "de Vaugirard", "68 -> 70")
    add(p, [823], "Rue d'Assas", "rue", "d'Assas", "15, 17, 21")
    add(p, [823], "Rue de Rennes", "rue", "de Rennes", "83 -> 103")
    add(p, [824], "Rue Madame", "rue", "Madame", "40 -> 46")
    add(p, [824], "Rue de Vaugirard", "rue", "de Vaugirard", "64-66")
    add(p, [824], "Rue Cassette", "rue", "Cassette", "25 -> 29")
    add(p, [825], "Rue Madame", "rue", "Madame", "48")
    add(p, [825], "Rue de Vaugirard", "rue", "de Vaugirard", "27")
    add(p, [825], "Rue Madame", "rue", "Madame", "48")
    add(p, [825], "Rue de Vaugirard", "rue", "de Vaugirard", "29")
    add(p, [825], "Rue Madame", "rue", "Madame", "50 -> 60")
    add(p, [825], "Rue Jean Bart", "rue", "Jean Bart", "2, 5 -> 9")
    add(p, [826], "Rue de Rennes", "rue", "de Rennes", "7")
    add(p, [826], "Rue Madame", "rue", "Madame", "62 -> 72")
    add(p, [826], "Rue d'Assas", "rue", "d'Assas", "47, 39 -> 43")
    add(p, [826], "Rue Madame", "rue", "Madame", "74")
    add(p, [827], "Rue d'Assas", "rue", "d'Assas", "49")
    add(p, [827], "Rue Jean Bart", "rue", "Jean Bart", "4 -> 10, 1")
    add(p, [827], "Rue de Fleurus", "rue", "de Fleurus", "16 -> 18")
    add(p, [827], "Rue de la Clef", "rue", "de la Clef", "32")
    add(p, [827], "Rue d'Assas", "rue", "d'Assas", "27 -> 33")
    add(
        p,
        [827],
        "Rue Saint-Denis",
        "rue",
        "Saint-Denis",
        "163",
        low_confidence=True,
        scan_note="Unusual voie for NDDC context; verify scan reading",
    )

    # --- Page 2 ---
    p = 2
    add(p, [827], "Rue d'Assas", "rue", "d'Assas", "33 -> 35")
    add(p, [827], "Rue de Vaugirard", "rue", "de Vaugirard", "31 -> 39")
    add(p, [828], "Rue d'Assas", "rue", "d'Assas", "20 -> 28")
    add(p, [827], "Rue d'Assas", "rue", "d'Assas", "35")
    add(p, [828], "Rue d'Assas", "rue", "d'Assas", "28")
    add(p, [828], "Rue de Vaugirard", "rue", "de Vaugirard", "78")
    add(p, [828], "Bd Raspail", "boulevard", "Raspail", "85")
    add(p, [828], "Rue de Rennes", "rue", "de Rennes", "105 -> 117")
    add(p, [828], "Bd Raspail", "boulevard", "Raspail", "83")
    add(p, [828], "Rue de Rennes", "rue", "de Rennes", "117")
    add(p, [829], "Rue de Vaugirard", "rue", "de Vaugirard", "47 -> 55")
    add(
        p,
        [829],
        "Rue d'Assas",
        "rue",
        "d'Assas",
        "40, 36, 40, 38, 36, 38, 42 -> 44",
    )
    add(p, [829], "Rue de Fleurus", "rue", "de Fleurus", "22 -> 28, 36")
    add(p, [829], "Bd Raspail", "boulevard", "Raspail", "95")
    add(p, [830], "Rue de Fleurus", "rue", "de Fleurus", "21 -> 27, 31 -> 35")
    add(p, [830], "Rue Duguay-Trouin", "rue", "Duguay-Trouin", "11, 15")
    add(p, [830], "Rue de Fleurus", "rue", "de Fleurus", "15")
    add(p, [830], "Rue Duguay-Trouin", "rue", "Duguay-Trouin", "17")
    add(p, [830], "Rue de Fleurus", "rue", "de Fleurus", "31")
    add(p, [830], "Rue Duguay-Trouin", "rue", "Duguay-Trouin", "17 -> 19")
    add(p, [830], "Rue Huysmans", "rue", "Huysmans", "2 -> 10")

    add(p, [830], "Bd Raspail", "boulevard", "Raspail", "97 -> 101, 105 -> 107")
    add(
        p,
        [830, 831],
        "Rue d'Assas",
        "rue",
        "d'Assas",
        "56, 54, 52, 50, 48, 46",
    )
    add(
        p,
        [831, 832],
        "Rue Duguay-Trouin",
        "rue",
        "Duguay-Trouin",
        "8 -> 12, 3 -> 07",
    )
    add(p, [832], "Rue d'Assas", "rue", "d'Assas", "58 -> 76")
    add(p, [832], "Rue Jadin", "rue", "Jadin", "6 -> 16")
    add(
        p,
        [832],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "39, 51, 53",
    )
    add(p, [832], "Bd Raspail", "boulevard", "Raspail", "121")
    add(p, [832], "Rue Huysmans", "rue", "Huysmans", "1 -> 9")
    add(p, [833], "Rue Jadin", "rue", "Jadin", "5 -> 17")
    add(
        p,
        [833],
        "Rue d'Assas",
        "rue",
        "d'Assas",
        "78 -> 86, 90, 98 -> 104",
    )
    add(p, [833], "Rue Joseph Bara", "rue", "Joseph Bara", "2 -> 8")
    add(
        p,
        [833],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "59 -> 61 bis, 73 -> 79, 83 -> 87",
    )
    add(p, [834], "Rue d'Assas", "rue", "d'Assas", "112")
    add(p, [834], "Rue Le Verrier", "rue", "Le Verrier", "2 -> 20")
    add(
        p,
        [834],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "97 bis -> 99",
    )
    add(p, [834], "Rue Joseph Bara", "rue", "Joseph Bara", "1 -> 9, 15")
    add(
        p,
        [835],
        "Rue d'Assas",
        "rue",
        "d'Assas",
        "116, 118, 55, 118 -> 132, 136",
        low_confidence=True,
        scan_note="Dense corrections in N° cell",
    )
    add(
        p,
        [835],
        "Avenue de l'Observatoire",
        "avenue",
        "de l'Observatoire",
        "12 -> 16, 14, 16, 14, 18",
        low_confidence=True,
    )

    # --- Page 3 ---
    p = 3
    add(
        p,
        [835],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "103 -> 111, 115, 113, 115 -> 125",
    )
    add(p, [835], "Rue d'Assas", "rue", "d'Assas", "118 -> 120")
    add(
        p,
        [835],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "127",
    )
    add(p, [835], "Rue Le Verrier", "rue", "Le Verrier", "3, 7 -> 23")
    add(p, [836], "Rue René Pauline", "rue", "René Pauline", "1")
    add(
        p,
        [836],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "86",
    )
    add(
        p,
        [836],
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "133 -> 167, 171",
    )
    add(
        p,
        [837],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "82",
    )
    add(
        p,
        [837],
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "129",
    )
    add(p, [837], "Rue de Chevreuse", "rue", "de Chevreuse", "3 -> 5")
    add(
        p,
        [838],
        "Rue de la Grande-Chaumière",
        "rue",
        "de la Grande-Chaumière",
        "3, 7 -> 15",
    )
    add(
        p,
        [838],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "74 -> 78",
    )
    add(p, [838], "Rue de Chevreuse", "rue", "de Chevreuse", "4 -> 6")
    add(
        p,
        [838],
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "117, 119, 123 -> 125",
    )
    add(
        p,
        [839],
        "Rue Jules Chaplain",
        "rue",
        "Jules Chaplain",
        "5, 7, 11, 11 bis, 17",
    )
    add(
        p,
        [839],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "66 -> 72",
    )
    add(
        p,
        [839],
        "Rue de la Grande-Chaumière",
        "rue",
        "de la Grande-Chaumière",
        "4, 4 bis, 8 -> 18",
    )
    add(p, [839], "Bd Raspail", "boulevard", "Raspail", "145 -> 147")
    add(p, [840], "Rue Bréa", "rue", "Bréa", "23 -> 27")
    add(
        p,
        [840],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "54 -> 56",
    )
    add(p, [840], "Rue Jules Chaplain", "rue", "Jules Chaplain", "4 -> 8")

    add(p, [840], "Rue Bréa", "rue", "Bréa", "1 -> 21")
    add(p, [841], "Rue Vavin", "rue", "Vavin", "19 -> 27, 31 -> 33")
    add(p, [841], "Bd Raspail", "boulevard", "Raspail", "139 -> 143")
    add(p, [841], "Rue Bréa", "rue", "Bréa", "4 -> 14")
    add(p, [842], "Rue Sainte-Beuve", "rue", "Sainte-Beuve", "3 -> 9")
    add(
        p,
        [842],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "46",
    )
    add(p, [842], "Rue Vavin", "rue", "Vavin", "18, 22, 26")
    add(p, [842], "Bd Raspail", "boulevard", "Raspail", "133 -> 137")
    add(
        p,
        [843],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "42 -> 44",
    )
    add(p, [843], "Rue Sainte-Beuve", "rue", "Sainte-Beuve", "4 -> 8")
    add(p, [843], "Bd Raspail", "boulevard", "Raspail", "127 -> 131")
    add(p, [844], "Rue Vavin", "rue", "Vavin", "15 -> 17")
    add(p, [844], "Bd Raspail", "boulevard", "Raspail", "132 -> 136")
    add(
        p,
        [844],
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "101, 120",
        low_confidence=True,
        scan_note="Crossed-out îlot revision adjacent on scan; îlot 844 kept",
    )
    add(p, [845], "Bd Raspail", "boulevard", "Raspail", "122 -> 126")
    add(p, [845], "Rue Vavin", "rue", "Vavin", "46 -> 54")
    add(p, [845], "Bd du Montparnasse", "boulevard", "du Montparnasse", "97")
    add(p, [845], "Rue Péguy", "rue", "Péguy", "3")
    add(p, [845], "Bd du Montparnasse", "boulevard", "du Montparnasse", "91")
    add(p, [845], "Rue Péguy", "rue", "Péguy", "5 -> 7")
    add(p, [845], "Rue Stanislas", "rue", "Stanislas", "5 -> 7")
    add(p, [845], "Bd Raspail", "boulevard", "Raspail", "128")
    add(p, [845], "Rue Vavin", "rue", "Vavin", "44")

    # --- Page 4 (îlot bracket zone: heuristic) ---
    p = 4
    add(p, [845], "Rue Stanislas", "rue", "Stanislas", "9 -> 11")
    triple = [846, 847, 848]
    add(
        p,
        triple,
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "93, 91",
        low_confidence=True,
        scan_note="Bracket îlots 846–848; vertical wrap in ADRESSE/N°",
    )
    add(
        p,
        triple,
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "30",
        low_confidence=True,
        scan_note="Bracket îlots 846–848",
    )
    add(
        p,
        triple,
        "Bd Raspail",
        "boulevard",
        "Raspail",
        "110 -> 118",
        low_confidence=True,
        scan_note="Bracket îlots 846–848",
    )
    add(
        p,
        triple,
        "Rue Stanislas",
        "rue",
        "Stanislas",
        "6 -> 16",
        low_confidence=True,
        scan_note="Bracket îlots 846–848",
    )
    add(
        p,
        triple,
        "Rue de la Cité",
        "rue",
        "de la Cité",
        "4",
        low_confidence=True,
        scan_note="Hand as 'Rue de Cité'; normalized libellé",
    )
    add(
        p,
        triple,
        "Rue du Montparnasse",
        "rue",
        "du Montparnasse",
        "3 -> 7, 11, 15 -> 25",
        low_confidence=True,
        scan_note="Bracket îlots 846–848",
    )
    add(
        p,
        [848],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "8, 12, 22, 12, 20, 36, 38",
        low_confidence=True,
        scan_note="Explicit îlot 848 line on scan after bracket",
    )
    add(
        p,
        [848],
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "71 -> 79",
        low_confidence=True,
    )
    add(p, [848], "Impasse Robiquet", "impasse", "Robiquet", "7")
    add(p, [848], "Bd du Montparnasse", "boulevard", "du Montparnasse", "81")
    add(p, [848], "Impasse Robiquet", "impasse", "Robiquet", "7")
    add(p, [848], "Bd du Montparnasse", "boulevard", "du Montparnasse", "83 -> 89")
    add(p, [848], "Place de Rennes", "place", "de Rennes", "3 -> 5")
    add(
        p,
        [849],
        "Rue de Rennes",
        "rue",
        "de Rennes",
        "127 -> 137, 141, 169, 167, 165, 163, 161, 141, 143, 147, 149, 151, 151 bis, 153, 159, 169",
        low_confidence=True,
        scan_note="Tall N° block; stitched from multi-line cell",
    )
    add(
        p,
        [849],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "169",
    )
    add(p, [849], "Rue de Rennes", "rue", "de Rennes", "171")

    # Right half: sticky îlot within column; six explicit îlot headers for 22 rows
    add(p, [850], "Rue de Fleurus", "rue", "de Fleurus", "43")
    add(p, [851], "Bd Raspail", "boulevard", "Raspail", "92, 96")
    add(
        p,
        [851],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "11, 17",
    )
    add(p, [851], "Bd Raspail", "boulevard", "Raspail", "84, 90, 26")
    add(p, [851], "Rue de Fleurus", "rue", "de Fleurus", "44")
    add(p, [852], "Rue Notre-Dame-des-Champs", "rue", "Notre-Dame-des-Champs", "3 -> 05")
    add(p, [852], "Rue de Vaugirard", "rue", "de Vaugirard", "61 -> 63")
    add(p, [852], "Rue de Rennes", "rue", "de Rennes", "80, 121, 123")
    add(p, [852], "Bd Raspail", "boulevard", "Raspail", "58, 66, 72, 74")
    add(
        p,
        [853],
        "Rue de Rennes",
        "rue",
        "de Rennes",
        "112 bis -> 116",
    )
    add(p, [853], "Rue du Regard", "rue", "du Regard", "1 -> 11, 15")
    add(
        p,
        [853],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "37",
    )
    add(
        p,
        [853],
        "Rue du Regard",
        "rue",
        "du Regard",
        "4, 6, 10, 12 -> 24",
    )
    add(p, [853], "Rue de Rennes", "rue", "de Rennes", "120")
    add(
        p,
        [854],
        "Rue Saint-Placide",
        "rue",
        "Saint-Placide",
        "29 -> 53",
    )
    add(
        p,
        [854],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "39 -> 45",
    )
    add(
        p,
        [854],
        "Rue Saint-Placide",
        "rue",
        "Saint-Placide",
        "30 -> 62",
    )
    add(p, [854], "Rue de Vaugirard", "rue", "de Vaugirard", "90")
    add(
        p,
        [855],
        "Rue Abbé Grégoire",
        "rue",
        "Abbé Grégoire",
        "21 -> 45",
    )
    add(
        p,
        [855],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "22 -> 24",
    )
    add(
        p,
        [855],
        "Rue Abbé Grégoire",
        "rue",
        "Abbé Grégoire",
        "53 -> 57",
    )
    add(
        p,
        [855],
        "Rue Régis",
        "rue",
        "Régis",
        "4 -> 08",
    )

    # --- Page 5 ---
    p = 5
    add(
        p,
        [856],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "67, 65, 63, 61",
    )
    add(
        p,
        [857],
        "Rue Abbé Grégoire",
        "rue",
        "Abbé Grégoire",
        "24 bis",
    )
    add(p, [857], "Rue Gerbillon", "rue", "Gerbillon", "2")
    add(p, [857], "Rue Bérite", "rue", "Bérite", "5")
    add(p, [857], "Rue Régis", "rue", "Régis", "1 -> 3")
    add(p, [858], "Rue Bérite", "rue", "Bérite", "4")
    add(p, [858], "Rue Gerbillon", "rue", "Gerbillon", "3 -> 9")
    add(p, [858], "Rue Abbé Grégoire", "rue", "Abbé Grégoire", "26")
    add(p, [858], "Rue de Vaugirard", "rue", "de Vaugirard", "92")
    add(p, [858], "Rue Chapon", "rue", "Chapon", "40")
    add(p, [858], "Rue de Vaugirard", "rue", "de Vaugirard", "98 -> 100")
    add(
        p,
        [858],
        "Rue Jean Ferrandi",
        "rue",
        "Jean Ferrandi",
        "3, 3 bis, 7, 9, 11, 15",
    )
    add(
        p,
        [858],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "71 -> 83",
    )
    add(
        p,
        [859],
        "Rue de Vaugirard",
        "rue",
        "de Vaugirard",
        "69 bis -> 73",
    )
    add(
        p,
        [859],
        "Rue Notre-Dame-des-Champs",
        "rue",
        "Notre-Dame-des-Champs",
        "75",
    )
    add(p, [859], "Rue de Vaugirard", "rue", "de Vaugirard", "75 - 77")
    add(p, [859], "Rue de Rennes", "rue", "de Rennes", "122 -> 134")
    add(
        p,
        [859, 860],
        "Rue Blaise Desgoffe",
        "rue",
        "Blaise Desgoffe",
        "1 -> 3, 2 -> 10",
    )
    add(
        p,
        [859, 860],
        "Rue de Rennes",
        "rue",
        "de Rennes",
        "140 bis -> 148",
    )
    add(p, [859, 860], "Rue Littré", "rue", "Littré", "1 -> 19")
    add(
        p,
        [861],
        "Rue de Vaugirard",
        "rue",
        "de Vaugirard",
        "85 -> 105, 109 -> 111",
    )
    add(
        p,
        [861],
        "Rue Littré",
        "rue",
        "Littré",
        "6 -> 12, 6, 12 -> 20",
        low_confidence=True,
        scan_note="Overwrite/corrections in N°",
    )

    add(p, [861], "Rue de Rennes", "rue", "de Rennes", "150 -> 152")
    add(p, [861], "Place de Rennes", "place", "de Rennes", "4 - 6")
    add(
        p,
        [861],
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "33 -> 61",
    )
    add(
        p,
        [862],
        "Rue Jean Ferrandi",
        "rue",
        "Jean Ferrandi",
        "4 -> 16",
    )
    add(
        p,
        [862],
        "Rue de Vaugirard",
        "rue",
        "de Vaugirard",
        "102, 108 -> 118, 122 -> 130",
    )
    add(
        p,
        [862],
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "23, 27, 25",
    )
    add(
        p,
        [862],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "85 -> 91 bis, 95 -> 119",
        scan_note="Stitched blank ADRESSE continuation row",
    )
    add(
        p,
        [863],
        "Rue Mayet",
        "rue",
        "Mayet",
        "4 -> 6, 10, 14 -> 24",
    )
    add(
        p,
        [863],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "124 -> 128",
    )
    add(p, [863], "Bd du Montparnasse", "boulevard", "du Montparnasse", "1")
    add(p, [863], "Rue Saint-Placide", "rue", "Saint-Placide", "58")
    add(
        p,
        [863],
        "Bd du Montparnasse",
        "boulevard",
        "du Montparnasse",
        "45 -> 13, 17 -> 19",
        low_confidence=True,
        scan_note="Non-monotonic range; transcribed verbatim",
    )
    add(
        p,
        [863],
        "Rue de Sèvres",
        "rue",
        "de Sèvres",
        "133 -> 139",
    )
    add(
        p,
        [864],
        "Rue de la Barouillère",
        "rue",
        "de la Barouillère",
        "2, 6 -> 12, 16",
    )
    add(
        p,
        [864],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "112, 120",
    )
    add(
        p,
        [864],
        "Rue Mayet",
        "rue",
        "Mayet",
        "1 -> 17, 21 -> 23, 27 -> 29",
    )
    add(
        p,
        [864],
        "Rue de Sèvres",
        "rue",
        "de Sèvres",
        "121 -> 129",
    )
    add(
        p,
        [865],
        "Rue Saint-Romain",
        "rue",
        "Saint-Romain",
        "8, 16 -> 20",
    )
    add(
        p,
        [865],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "106 -> 110",
    )
    add(p, [865], "Rue de la Barouillère", "rue", "de la Barouillère", "1")

    # --- Page 6 ---
    p = 6
    add(p, [865], "Rue de Sèvres", "rue", "de Sèvres", "111 -> 115")
    add(p, [866], "Rue Abbé Grégoire", "rue", "Abbé Grégoire", "2 -> 6")
    add(
        p,
        [866],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "66-086, 98 bis -> 100, 86 -> 92, 98 -> 102",
        low_confidence=True,
        scan_note="Possible misread '66-086'; transcribed from scan",
    )
    add(p, [866], "Rue Saint-Romain", "rue", "Saint-Romain", "5, 9 -> 17")
    add(
        p,
        [866],
        "Rue de Sèvres",
        "rue",
        "de Sèvres",
        "79 -> 81, 85 -> 91, 97 -> 103, 107 -> 109",
    )
    add(
        p,
        [867],
        "Rue Saint-Placide",
        "rue",
        "Saint-Placide",
        "2, 6 -> 22, 26 -> 28",
    )
    add(
        p,
        [867],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "58, 60, 64",
    )
    add(
        p,
        [867],
        "Rue Abbé Grégoire",
        "rue",
        "Abbé Grégoire",
        "1 -> 05, 11 -> 15",
    )
    add(p, [867], "Rue de Sèvres", "rue", "de Sèvres", "61 -> 71")
    add(
        p,
        [868],
        "Rue Dupin",
        "rue",
        "Dupin",
        "2, 6, 14, 20, 22, 28",
    )
    add(
        p,
        [868],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "52 -> 54",
    )
    add(
        p,
        [868],
        "Rue Saint-Placide",
        "rue",
        "Saint-Placide",
        "1, 3, 7 -> 25",
    )
    add(p, [868], "Rue Littré", "rue", "Littré", "51 -> 55")
    add(p, [869], "Bd Raspail", "boulevard", "Raspail", "48")
    add(
        p,
        [869],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "38 -> 44, 48",
    )
    add(p, [869], "Rue Dupin", "rue", "Dupin", "5 -> 19")
    add(
        p,
        [869],
        "Rue Littré",
        "rue",
        "Littré",
        "29, 35, 39, 29, 33, 39, 43 -> 47",
        low_confidence=True,
    )
    add(p, [870], "Rue d'Assas", "rue", "d'Assas", "4 -> 16")
    add(p, [870], "Rue de Rennes", "rue", "de Rennes", "106 -> 118")
    add(
        p,
        [870],
        "Bd Raspail",
        "boulevard",
        "Raspail",
        "59, 63, 61, 67, 71 -> 79",
    )

    add(
        p,
        [870],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "27",
    )
    add(p, [871], "Rue Coëtlogon", "rue", "Coëtlogon", "3 -> 9")
    add(p, [871], "Rue de Rennes", "rue", "de Rennes", "94 -> 104")
    add(p, [871], "Rue d'Assas", "rue", "d'Assas", "7 -> 11")
    add(p, [872], "Rue de Sèvres", "rue", "de Sèvres", "3 -> 17")
    add(p, [872], "Rue de Rennes", "rue", "de Rennes", "110")
    add(
        p,
        [872],
        "Rue de Sèvres",
        "rue",
        "de Sèvres",
        "17, 6, 17 -> 21",
        low_confidence=True,
    )
    add(
        p,
        [872],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "2 -> 4 ter",
    )
    add(p, [872], "Rue Coëtlogon", "rue", "Coëtlogon", "9")
    add(p, [874], "Rue du Vieux-Colombier", "rue", "du Vieux-Colombier", "18/20")
    add(p, [874], "Carrefour Croix Rouge", "carrefour", "Croix Rouge", "1")
    add(
        p,
        [872],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "4 ter -> 26",
        scan_note="PAGE shows îlot 872 again after îlot 874 block",
    )
    add(
        p,
        [872],
        "Place Alphonse Deville",
        "place",
        "Alphonse Deville",
        "1",
    )
    add(p, [872], "Bd Raspail", "boulevard", "Raspail", "43")
    add(
        p,
        [873],
        "Rue du Vieux-Colombier",
        "rue",
        "du Vieux-Colombier",
        "17 -> 25",
    )
    add(
        p,
        [873],
        "Rue de Rennes",
        "rue",
        "de Rennes",
        "72 -> 76, 80 -> 92",
    )
    add(p, [873], "Rue Coëtlogon", "rue", "Coëtlogon", "4 -> 10")
    add(p, [873], "Rue d'Assas", "rue", "d'Assas", "1 -> 5")
    add(
        p,
        [873],
        "Rue du Cherche-Midi",
        "rue",
        "du Cherche-Midi",
        "3 -> 23",
    )
    add(p, [874], "Rue du Four", "rue", "du Four", "49 -> 53")
    add(p, [874], "Rue de Rennes", "rue", "de Rennes", "66 -> 70")
    add(
        p,
        [874],
        "Rue du Vieux-Colombier",
        "rue",
        "du Vieux-Colombier",
        "16 -> 18",
    )

    root = {
        "document_scope": {
            "quartier": "Notre-Dame-des-Champs",
            "arrondissement": 6,
            "bobine": 8,
            "audit": {
                "period": "1946/8",
                "series": "2MI 24",
                "source_filename": "Bobine 8 - 6ème - NOTRE-DAME-DES-CHAMPS.pdf",
                "extraction_note": "Raster render 2x; header series varies slightly by page on scan (e.g. 2MI 27 p.6).",
            },
        },
        "logical_records": rows,
    }

    out = "/Users/danie/Documents/PROJECTS/andriveau-bobine/.tmp/bobine8-extraction.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(root, f, ensure_ascii=False, indent=2)
    print(out, "records", len(rows))


if __name__ == "__main__":
    main()
