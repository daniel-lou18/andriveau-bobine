#!/usr/bin/env python3
"""Build bobine 43 Grandes Carrières interchange JSON (vision-assisted row tables)."""
from __future__ import annotations

import json
from typing import Any


def row(
    idx: int,
    pdf_page: int,
    ilots: list[int],
    street_display: str,
    rtype: str,
    libelle: str,
    numeros_raw: str,
    *,
    source_page: int | None = None,
    inferred: bool = False,
    low_confidence: bool = False,
    scan_note: str | None = None,
) -> dict[str, Any]:
    ilot_s = ", ".join(str(x) for x in ilots)
    raw = f"Ilot {ilot_s} | {street_display} | {numeros_raw}"
    rue: dict[str, Any] = {"type": rtype, "libelle": libelle}
    if inferred:
        rue["inferred"] = True
    o: dict[str, Any] = {
        "reading_order_index": idx,
        "pdf_page": pdf_page,
        "ilot_numbers": ilots,
        "raw_text": raw,
        "rue": rue,
        "numeros_raw": numeros_raw,
    }
    if source_page is not None and source_page != pdf_page:
        o["page"] = source_page
    if low_confidence:
        o["low_confidence"] = True
    if scan_note:
        o["scan_note"] = scan_note
    return o


def main() -> None:
    R: list[dict[str, Any]] = []
    i = 0

    def add(
        pdf_p: int,
        ilots: list[int],
        street_display: str,
        rtype: str,
        libelle: str,
        nums: str,
        *,
        source_page: int | None = None,
        **kw: Any,
    ) -> None:
        nonlocal i
        R.append(
            row(
                i,
                pdf_p,
                ilots,
                street_display,
                rtype,
                libelle,
                nums,
                source_page=source_page,
                **kw,
            )
        )
        i += 1

    # ----- Page 1: left (bobine sheet p.1) then right (sheet p.4) -----
    sp1, sp4 = 1, 4
    p = 1

    add(
        p,
        [4089],
        "Rue Fauvet",
        "rue",
        "Fauvet",
        "3 -> 19",
        source_page=sp1,
        scan_note="(43) p.1",
    )
    add(p, [4089], "Rue Ganneron", "rue", "Ganneron", "33; 39; 47", source_page=sp1)
    add(
        p,
        [4089],
        "Rue Hégésippe-Moreau",
        "rue",
        "Hégésippe-Moreau",
        "13 -> 19",
        source_page=sp1,
    )
    add(
        p,
        [4089],
        "Rue Étienne-Jodelle",
        "rue",
        "Étienne-Jodelle",
        "4 -> 12",
        source_page=sp1,
    )
    add(
        p,
        [4089],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "14 -> 28; 32 -> 36",
        source_page=sp1,
    )
    # Impasse Rotschild blank N° — omit (no extractable numbers)
    add(
        p,
        [4089],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "30",
        source_page=sp1,
    )
    add(
        p,
        [4089],
        "Cité Filleux",
        "cité",
        "Filleux",
        "1; 3; 11; 15; 15 bis; 43; 51; 2; 6; 8; 12; 20; 22; 26; 36; 38; 46",
        source_page=sp1,
        low_confidence=True,
        scan_note="Long list; boxed cluster on scan",
    )

    add(
        p,
        [4090],
        "Rue Étienne-Jodelle",
        "rue",
        "Étienne-Jodelle",
        "3 -> 7",
        source_page=sp1,
    )
    add(
        p,
        [4090],
        "Rue Pierre Génier",
        "rue",
        "Pierre Génier",
        "3 -> 11",
        source_page=sp1,
    )
    add(
        p,
        [4090],
        "Avenue de Clichy",
        "avenue",
        "de Clichy",
        "52 -> 62",
        source_page=sp1,
    )
    add(
        p,
        [4090],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "2; 6 -> 10",
        source_page=sp1,
    )
    add(
        p,
        [4091],
        "Rue Hégésippe-Moreau",
        "rue",
        "Hégésippe-Moreau",
        "11; 11 bis",
        source_page=sp1,
    )
    add(
        p,
        [4092],
        "Rue Hégésippe-Moreau",
        "rue",
        "Hégésippe-Moreau",
        "2; 4; 8 -> 18",
        source_page=sp1,
        scan_note='Adresse ditto "',
    )
    add(p, [4092], "Rue Ganneron", "rue", "Ganneron", "19; 25", source_page=sp1)
    add(
        p,
        [4093],
        "Rue Pierre Génier",
        "rue",
        "Pierre Génier",
        "8",
        source_page=sp1,
    )
    add(
        p,
        [4093],
        "Rue Hégésippe-Moreau",
        "rue",
        "Hégésippe-Moreau",
        "3 -> 9",
        source_page=sp1,
    )

    add(
        p,
        [4093],
        "Rue Ganneron",
        "rue",
        "Ganneron",
        "3 -> 15",
        source_page=sp4,
        scan_note="(43) p.4",
    )
    add(
        p,
        [4093],
        "Avenue de Clichy",
        "avenue",
        "de Clichy",
        "40 -> 50",
        source_page=sp4,
    )
    add(
        p,
        [4094],
        "Rue Ganneron",
        "rue",
        "Ganneron",
        "6 -> 16",
        source_page=sp4,
    )
    add(
        p,
        [4094],
        "Rue Cavalotti",
        "rue",
        "Cavalotti",
        "1 -> 17; 21; 23; 27",
        source_page=sp4,
        scan_note="Scan reads 'Cavalotte'; normalized to Cavalotti",
    )
    add(
        p,
        [4094],
        "Avenue de Clichy",
        "avenue",
        "de Clichy",
        "20 -> 28; 34; 36",
        source_page=sp4,
    )
    add(
        p,
        [4094],
        "Impasse de la Défense",
        "impasse",
        "de la Défense",
        "5; 6 -> 10; 11; 15",
        source_page=sp4,
        scan_note="Hand 'Defense'",
    )
    add(
        p,
        [4094],
        "Impasse des Deux Nèthes",
        "impasse",
        "des Deux Nèthes",
        "3; 9; 10; 12; 18",
        source_page=sp4,
        scan_note="Scan 'des 2 Nethes'",
    )
    add(p, [4095], "Rue Capron", "rue", "Capron", "2", source_page=sp4)
    add(p, [4095], "Rue Forest", "rue", "Forest", "1 -> 9", source_page=sp4)
    add(
        p,
        [4095],
        "Avenue de Clichy",
        "avenue",
        "de Clichy",
        "16; 18",
        source_page=sp4,
    )
    add(
        p,
        [4095],
        "Passage Lathuille",
        "passage",
        "Lathuille",
        "1; 5 -> 11; 17 -> 23; 15",
        source_page=sp4,
        low_confidence=True,
        scan_note="Token '1' placement crowded in cell",
    )
    add(
        p,
        [4095],
        "Passage de Clichy",
        "passage",
        "de Clichy",
        "6; 17",
        source_page=sp4,
        scan_note="Scan 'Passage Clichy'",
    )
    add(
        p,
        [4096],
        "Passage Lathuille",
        "passage",
        "Lathuille",
        "2; 6 -> 10; 1; 12; 14",
        source_page=sp4,
    )
    add(
        p,
        [4096],
        "Passage de Clichy",
        "passage",
        "de Clichy",
        "2; 10 -> 18",
        source_page=sp4,
    )
    add(
        p,
        [4096],
        "Boulevard de Clichy",
        "boulevard",
        "de Clichy",
        "128 -> 134",
        source_page=sp4,
    )
    add(
        p,
        [4096],
        "Avenue de Clichy",
        "avenue",
        "de Clichy",
        "12; 14",
        source_page=sp4,
    )
    add(
        p,
        [4096],
        "Avenue de Clichy",
        "avenue",
        "de Clichy",
        "2; 12; 12 bis",
        source_page=sp4,
    )

    # ----- Page 2 -----
    p, sp = 2, 5
    add(
        p,
        [4096],
        "Place de Clichy",
        "place",
        "de Clichy",
        "16",
        source_page=sp,
        scan_note="(43) p.5",
    )
    add(p, [4097], "Rue Caulaincourt", "rue", "Caulaincourt", "13", source_page=sp)
    add(p, [4097], "Rue Forest", "rue", "Forest", "12 -> 16", source_page=sp)
    add(p, [4097], "Rue Cavalotti", "rue", "Cavalotti", "4 -> 14", source_page=sp)
    add(
        p,
        [4097],
        "Rue Camille Tahan",
        "rue",
        "Camille Tahan",
        "2; 3; 4 -> 8",
        source_page=sp,
    )
    add(p, [4097], "Rue Ganneron", "rue", "Ganneron", "24", source_page=sp)
    add(
        p,
        [4098],
        "Passage du Lavoir",
        "passage",
        "du Lavoir",
        "2; 6 -> 12; 16 -> 22",
        source_page=sp,
    )
    add(p, [4098], "Rue Ganneron", "rue", "Ganneron", "53", source_page=sp)
    add(p, [4098], "Rue Fauvet", "rue", "Fauvet", "2 -> 18", source_page=sp)
    add(
        p,
        [4099],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "42",
        source_page=sp,
    )
    add(
        p,
        [4099],
        "Passage du Lavoir",
        "passage",
        "du Lavoir",
        "3 -> 13",
        source_page=sp,
    )
    add(
        p,
        [4100],
        "Villa Saint-Michel",
        "villa",
        "Saint-Michel",
        "4 -> 8; 12 -> 16; 26",
        source_page=sp,
    )
    add(p, [4100], "Rue Ganneron", "rue", "Ganneron", "59; 61", source_page=sp)
    add(
        p,
        [4100],
        "Passage Ganneron",
        "passage",
        "Ganneron",
        "9 -> 17; 21; 25; 27",
        source_page=sp,
    )
    add(
        p,
        [4100],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "44; 46",
        source_page=sp,
    )
    add(
        p,
        [4101],
        "Passage Davy",
        "passage",
        "Davy",
        "2 -> 8; 12",
        source_page=sp,
    )
    add(
        p,
        [4101],
        "Villa Saint-Michel",
        "villa",
        "Saint-Michel",
        "1 -> 17; 25",
        source_page=sp,
    )

    add(
        p,
        [4102],
        "Rue Étex",
        "rue",
        "Étex",
        "3 -> 19; 23",
        source_page=sp,
        scan_note="(43) p.5 right column",
    )
    add(p, [4102], "Rue Ganneron", "rue", "Ganneron", "65; 71", source_page=sp)
    add(
        p,
        [4102],
        "Passage Davy",
        "passage",
        "Davy",
        "3 -> 11",
        source_page=sp,
    )
    add(
        p,
        [4102],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "52 -> 62",
        source_page=sp,
    )
    add(
        p,
        [4093],
        "Avenue de Clichy",
        "avenue",
        "de Clichy",
        "48",
        source_page=sp,
        scan_note="Îlot 4093 reappears later on sheet",
    )
    add(p, [4094], "Rue Cavalotti", "rue", "Cavalotti", "15", source_page=sp)
    add(
        p,
        [4102],
        "Passage Davy",
        "passage",
        "Davy",
        "11 -> 19; 23; 25; 29; 31",
        source_page=sp,
    )
    add(
        p,
        [4103],
        "Rue Coysevox",
        "rue",
        "Coysevox",
        "1 -> 7",
        source_page=sp,
    )
    add(
        p,
        [4103],
        "Rue Lamarck",
        "rue",
        "Lamarck",
        "135 -> 153",
        source_page=sp,
    )
    add(p, [4103], "Rue Étex", "rue", "Étex", "22 -> 32", source_page=sp)
    add(p, [4103], "Villa Étex", "villa", "Étex", "1 -> 5", source_page=sp)
    add(
        p,
        [4104],
        "Rue Coysevox",
        "rue",
        "Coysevox",
        "10 -> 2",
        source_page=sp,
        low_confidence=True,
        scan_note="Non-monotonic range as written",
    )
    add(p, [4104], "Rue Étex", "rue", "Étex", "6; 4", source_page=sp)
    add(p, [4104], "Rue Carpeaux", "rue", "Carpeaux", "1", source_page=sp)
    add(p, [4094], "Rue Cavalotti", "rue", "Cavalotti", "17", source_page=sp)
    add(
        p,
        [4104],
        "Rue Carpeaux",
        "rue",
        "Carpeaux",
        "1; 1 bis; 3; 3 bis; 9 -> 13",
        source_page=sp,
    )
    add(
        p,
        [4104],
        "Rue Joseph de Maistre",
        "rue",
        "Joseph de Maistre",
        "25",
        source_page=sp,
    )

    # ----- Page 3 -----
    p, sp = 3, 6
    add(
        p,
        [4104],
        "Rue Lamarck",
        "rue",
        "Lamarck",
        "123 -> 133",
        source_page=sp,
        scan_note="(43) p.6",
    )
    add(p, [4105], "Rue Carpeaux", "rue", "Carpeaux", "2", source_page=sp)
    add(
        p,
        [4106],
        "Rue Coysevox",
        "rue",
        "Coysevox",
        "14 -> 22",
        source_page=sp,
    )
    add(
        p,
        [4106],
        "Rue Joseph de Maistre",
        "rue",
        "Joseph de Maistre",
        "27 -> 39",
        source_page=sp,
    )
    add(
        p,
        [4106],
        "Rue Lamarck",
        "rue",
        "Lamarck",
        "142; 144; 148; 150",
        source_page=sp,
    )
    add(
        p,
        [4107],
        "Rue Coysevox",
        "rue",
        "Coysevox",
        "9; 9 bis; 11; 11 bis; 19 -> 23",
        source_page=sp,
    )
    add(
        p,
        [4107],
        "Rue d'Oslo",
        "rue",
        "d'Oslo",
        "2; 6; 8; 14",
        source_page=sp,
    )
    add(
        p,
        [4107],
        "Rue Lamarck",
        "rue",
        "Lamarck",
        "152; 154",
        source_page=sp,
    )
    add(
        p,
        [4108],
        "Rue Marcadet",
        "rue",
        "Marcadet",
        "251; 247",
        source_page=sp,
        low_confidence=True,
        scan_note="Stacked order in cell",
    )
    add(
        p,
        [4108],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "68 -> 80; 86; 88",
        source_page=sp,
    )
    add(p, [4108], "Rue Lamarck", "rue", "Lamarck", "162", source_page=sp)
    add(
        p,
        [4108],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "82",
        source_page=sp,
    )
    add(
        p,
        [4108],
        "Rue Lamarck",
        "rue",
        "Lamarck",
        "156; 158",
        source_page=sp,
    )
    add(p, [4108], "Rue d'Oslo", "rue", "d'Oslo", "3", source_page=sp)
    add(
        p,
        [4108],
        "Rue Marcadet",
        "rue",
        "Marcadet",
        "243; 247; 251",
        source_page=sp,
    )
    add(
        p,
        [4109],
        "Rue Championnet",
        "rue",
        "Championnet",
        "221; 231; 233",
        source_page=sp,
    )
    add(
        p,
        [4109],
        "Rue Joseph de Maistre",
        "rue",
        "Joseph de Maistre",
        "41",
        source_page=sp,
    )

    add(
        p,
        [4109],
        "Rue Marcadet",
        "rue",
        "Marcadet",
        "256; 258; 264 -> 268",
        source_page=sp,
    )
    add(
        p,
        [4110],
        "Rue Lagille",
        "rue",
        "Lagille",
        "8 -> 14; 20",
        source_page=sp,
    )
    add(
        p,
        [4110],
        "Rue Jacques Cartier",
        "rue",
        "Jacques Cartier",
        "1 -> 5",
        source_page=sp,
    )
    add(
        p,
        [4110],
        "Rue Championnet",
        "rue",
        "Championnet",
        "232 -> 240",
        source_page=sp,
    )
    add(
        p,
        [4110],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "90 -> 112",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Rue Belliard",
        "rue",
        "Belliard",
        "171; 175; 181; 183",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Rue Vauvenargues",
        "rue",
        "Vauvenargues",
        "45 -> 49",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Rue Championnet",
        "rue",
        "Championnet",
        "192; 196 -> 200 bis; 204 -> 210; 224; 226",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Villa Championnet",
        "villa",
        "Championnet",
        "4 -> 12",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Rue Jacques Cartier",
        "rue",
        "Jacques Cartier",
        "4",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Rue Lagille",
        "rue",
        "Lagille",
        "15 -> 31",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Rue Tennis",
        "rue",
        "Tennis",
        "2 -> 16; 22",
        source_page=sp,
        scan_note="Distinct from 'Rue des Tennis' below",
    )
    add(
        p,
        [4111],
        "Rue Firmin Gémier",
        "rue",
        "Firmin Gémier",
        "20; 23; 26; 28",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Impasse Cope",
        "impasse",
        "Cope",
        "1; 3; 4 -> 8",
        source_page=sp,
    )
    add(
        p,
        [4111],
        "Impasse Sainte-Monique",
        "impasse",
        "Sainte-Monique",
        "3; 3 bis; 7; 4; 5 -> 11; 8; 12; 14",
        source_page=sp,
        scan_note="Scan 'Ste Monique'",
    )
    add(
        p,
        [4112],
        "Rue Belliard",
        "rue",
        "Belliard",
        "185; 187",
        source_page=sp,
    )
    add(
        p,
        [4112],
        "Rue des Tennis",
        "rue",
        "des Tennis",
        "1 -> 23",
        source_page=sp,
    )

    # ----- Page 4 -----
    p, sp = 4, 7
    add(
        p,
        [4112],
        "Rue Lagille",
        "rue",
        "Lagille",
        "1 -> 11",
        source_page=sp,
        scan_note="(43) p.7",
    )
    add(
        p,
        [4112],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "120; 122",
        source_page=sp,
    )
    add(
        p,
        [4112],
        "Villa Belliard",
        "villa",
        "Belliard",
        "2 -> 6",
        source_page=sp,
    )
    add(
        p,
        [4113],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "124; 124 bis",
        source_page=sp,
    )
    add(
        p,
        [4113],
        "Passage Daunay",
        "passage",
        "Daunay",
        "4 -> 12",
        source_page=sp,
    )
    add(
        p,
        [4114],
        "Rue Belliard",
        "rue",
        "Belliard",
        "191, 193",
        source_page=sp,
    )
    add(
        p,
        [4114],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "126",
        source_page=sp,
    )
    # 4115 NEANT — skip
    add(
        p,
        [4116],
        "Rue Vauvenargues",
        "rue",
        "Vauvenargues",
        "75; 77; 85",
        source_page=sp,
    )
    add(
        p,
        [4116],
        "Rue de Leibnitz",
        "rue",
        "de Leibnitz",
        "82 -> 92; 96; 98",
        source_page=sp,
    )
    add(
        p,
        [4116],
        "Villa Vauvenargues",
        "villa",
        "Vauvenargues",
        "2 -> 10; 3 -> 11",
        source_page=sp,
        low_confidence=True,
        scan_note="Overlapping-style ranges as written",
    )
    add(
        p,
        [4116],
        "Avenue de Saint-Ouen",
        "avenue",
        "de Saint-Ouen",
        "132 -> 156",
        source_page=sp,
    )
    add(
        p,
        [4116],
        "Impasse Milord",
        "impasse",
        "Milord",
        "3; 5; 7 bis; 11; 4 -> 8; 12",
        source_page=sp,
        scan_note="Two-line N° cell stitched",
    )
    add(
        p,
        [4117],
        "Boulevard Ney",
        "boulevard",
        "Ney",
        "135 -> 147; 151, 153",
        source_page=sp,
    )
    add(
        p,
        [4117],
        "Passage Charles-Albert",
        "passage",
        "Charles-Albert",
        "3 -> 7 bis; 11 -> 29",
        source_page=sp,
        scan_note="Scan 'Charles Albert'",
    )
    add(
        p,
        [4117],
        "Rue de Leibnitz",
        "rue",
        "de Leibnitz",
        "72 bis",
        source_page=sp,
    )
    add(
        p,
        [4117],
        "Rue Vauvenargues",
        "rue",
        "Vauvenargues",
        "70 -> 80",
        source_page=sp,
    )

    # 4118 NEANT — skip
    add(
        p,
        [4119],
        "Boulevard Ney",
        "boulevard",
        "Ney",
        "119; 129; 131",
        source_page=sp,
    )
    add(
        p,
        [4119],
        "Rue Jean Dolfus",
        "rue",
        "Jean Dolfus",
        "3; 9 -> 15",
        source_page=sp,
        scan_note="Scan 'J. Dolfus'",
    )
    add(
        p,
        [4119],
        "Passage Charles-Albert",
        "passage",
        "Charles-Albert",
        "7 -> 12; 16; 18",
        source_page=sp,
    )
    add(
        p,
        [4119],
        "Square de Leibnitz",
        "square",
        "de Leibnitz",
        "1; 2; 3; 4; 5; 6; 7",
        source_page=sp,
    )
    add(
        p,
        [4119],
        "Rue Leibnitz",
        "rue",
        "Leibnitz",
        "52 -> 58",
        source_page=sp,
        scan_note="Scan 'Rue Leibnitz' (no 'de')",
    )
    add(
        p,
        [4119],
        "Impasse du Talus",
        "impasse",
        "du Talus",
        "2 -> 10; 3 -> 11; 15",
        source_page=sp,
    )
    add(p, [4120], "Boulevard Ney", "boulevard", "Ney", "170", source_page=sp)
    add(p, [4120], "Avenue Ney", "avenue", "Ney", "120", source_page=sp)
    add(
        p,
        [4120],
        "Avenue de la Porte de Saint-Ouen",
        "avenue",
        "de la Porte de Saint-Ouen",
        "6; 12 -> 16; 22",
        source_page=sp,
        scan_note="Scan 'Av de la Pte de St Ouen'",
    )
    # 4121 à 4126 NEANT — skip
    add(
        p,
        [4127],
        "Porte de Clignancourt",
        "porte",
        "de Clignancourt",
        "7, 9",
        source_page=sp,
        scan_note="Scan 'Pte de Clignancourt'",
    )
    add(
        p,
        [4127],
        "Rue Fernand Labori",
        "rue",
        "Fernand Labori",
        "2; 4",
        source_page=sp,
    )
    add(
        p,
        [4128],
        "Rue Fernand Labori",
        "rue",
        "Fernand Labori",
        "1; 3",
        source_page=sp,
        scan_note='Adresse ditto "',
    )
    add(p, [4128], "Boulevard Ney", "boulevard", "Ney", "118", source_page=sp)
    add(
        p,
        [4128],
        "Rue Eugène Fournier",
        "rue",
        "Eugène Fournier",
        "3",
        source_page=sp,
        scan_note="Scan 'Fourrier' on this page",
    )
    add(
        p,
        [4128],
        "Boulevard Ney",
        "boulevard",
        "Ney",
        "118",
        source_page=sp,
        low_confidence=True,
        scan_note="Scan 'Bol Ney'",
    )

    # ----- Page 5: left column only; bobine sheet p.8 -----
    p, sp = 5, 8
    add(
        p,
        [4128],
        "Rue Eugène Fournier",
        "rue",
        "Eugène Fournier",
        "3; 2; 4",
        source_page=sp,
        scan_note="Bp. 8",
    )
    add(
        p,
        [4129],
        "Rue Eugène Fournier",
        "rue",
        "Eugène Fournier",
        "5; 3",
        source_page=sp,
        scan_note='Adresse ditto "',
    )
    add(
        p,
        [4129],
        "Rue Charles Flammarion",
        "rue",
        "Charles Flammarion",
        "2",
        source_page=sp,
    )
    add(
        p,
        [4130],
        "Rue F. Schneider",
        "rue",
        "F. Schneider",
        "2; 4",
        source_page=sp,
        scan_note="Abbreviated praenomen on scan",
    )
    # 4131 NEANT — skip
    add(
        p,
        [4132],
        "Rue Marcel Sembat",
        "rue",
        "Marcel Sembat",
        "1; 3",
        source_page=sp,
    )
    add(
        p,
        [4133],
        "Avenue de la Porte Montmartre",
        "avenue",
        "de la Porte Montmartre",
        "5",
        source_page=sp,
        scan_note="Scan 'Av de la Pte Montmartre'",
    )
    add(
        p,
        [4133],
        "Rue Jean Varenne",
        "rue",
        "Jean Varenne",
        "6; 8",
        source_page=sp,
    )
    add(
        p,
        [4134],
        "Rue Jean Varenne",
        "rue",
        "Jean Varenne",
        "5 -> 13",
        source_page=sp,
        scan_note='Adresse ditto "',
    )

    root = {
        "document_scope": {
            "quartier": "Grandes Carrières",
            "arrondissement": 18,
            "bobine": 43,
            "audit": {
                "period": None,
                "series": None,
                "source_filename": "Bobine 43 - 18ème - GRANDES-CARRIERES.pdf",
                "extraction_note": "Bobine column uses (43) p.k / Bp.8; page field set when k ≠ pdf_page. NEANT rows omitted. Semicolon-heavy N° as on scan.",
            },
        },
        "logical_records": R,
    }
    # Drop null audit keys for cleaner JSON
    audit = root["document_scope"]["audit"]
    root["document_scope"]["audit"] = {k: v for k, v in audit.items() if v is not None}

    out = "/Users/danie/Documents/PROJECTS/andriveau-bobine/data/extracted-tables/bobine43-extraction.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(root, f, ensure_ascii=False, indent=2)
    print(out, "records", len(R))


if __name__ == "__main__":
    main()
