"""Envoie les photos du depot vers l'hebergement d'images o2switch.

Usage:
    python scripts/seed_images_o2switch.py [--dry-run]

Sert une seule fois : a partir de la, les photos vivent sur le serveur et la
route d'envoi de l'API prend le relais. Le script reste commite parce qu'il
documente comment le stock initial a ete constitue, et parce qu'il rejoue une
reconstruction si le serveur est perdu.

Chaque fichier est renomme avec une empreinte de son propre contenu :
recette.a1b2c3d4.webp. Une photo modifiee change donc de nom, ce qui autorise un
cache d'un an sans jamais servir une version perimee — exactement ce que faisait
Vite avant, et qu'on perd en sortant les images du bundle.

Le manifeste est ce qui remplace la decouverte au build : le site le lit pour
savoir quelles photos existent et sous quel nom, et affiche un pictogramme pour
celles qui n'y sont pas.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE = PROJECT_ROOT / "front" / "assets" / "images"
KINDS = ("recipe", "food")

SSH_KEY = Path.home() / ".ssh" / "o2switch_menu"
SSH_HOST = "luzi6802@bouclier.o2switch.net"
REMOTE_ROOT = "~/images.menuuu.duckdns.org"

# Huit caracteres hexadecimaux : de quoi rendre une collision impossible en
# pratique sur quelques centaines de fichiers, sans allonger les URL.
HASH_LENGTH = 8


def fingerprint(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()[:HASH_LENGTH]


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    if not SOURCE.is_dir():
        raise SystemExit(f"Introuvable : {SOURCE}")

    manifest: dict[str, object] = {"version": 1}
    staging = Path(tempfile.mkdtemp(prefix="menu-images-"))
    total_bytes = 0

    try:
        for kind in KINDS:
            entries: dict[str, str] = {}
            (staging / kind).mkdir(parents=True)

            for photo in sorted((SOURCE / kind).glob("*.webp")):
                name = f"{photo.stem}.{fingerprint(photo)}.webp"
                shutil.copy2(photo, staging / kind / name)
                entries[photo.stem] = name
                total_bytes += photo.stat().st_size

            manifest[kind] = entries
            print(f"{kind:8} : {len(entries)} photos")

        (staging / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"total    : {total_bytes / 1024 / 1024:.1f} Mo")

        if dry_run:
            print(f"\n--dry-run : rien envoye. Prepare dans {staging}")
            return

        # Un seul flux tar plutot que 145 connexions scp : plus rapide, et le
        # transfert est atomique du point de vue de chaque fichier.
        print("\nenvoi...")
        tar = subprocess.Popen(
            ["tar", "-C", str(staging), "-cf", "-", "."], stdout=subprocess.PIPE
        )
        remote = subprocess.run(
            ["ssh", "-i", str(SSH_KEY), "-o", "BatchMode=yes", SSH_HOST,
             f"tar -x -C {REMOTE_ROOT} && ls {REMOTE_ROOT}/recipe | wc -l"],
            stdin=tar.stdout,
            capture_output=True,
            text=True,
        )
        tar.wait()
        print(f"recettes sur le serveur : {remote.stdout.strip()}")
        if remote.returncode != 0:
            raise SystemExit(remote.stderr.strip())
    finally:
        shutil.rmtree(staging, ignore_errors=True)


if __name__ == "__main__":
    main()
