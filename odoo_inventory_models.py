import json
import requests

ODOO_URL = "https://totem-platform.odoo.com"
DB = "totem-platform"
LOGIN = "kantotemus@gmail.com"
API_KEY = "710c5b2223d24bff082512e7edfbec04a38e2758"

JSONRPC = f"{ODOO_URL}/jsonrpc"
OUT_FILE = "odoo_models_inventory.json"


def authenticate():
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "service": "common",
            "method": "authenticate",
            "args": [DB, LOGIN, API_KEY, {}]
        },
        "id": 1
    }
    r = requests.post(JSONRPC, json=payload, timeout=60)
    r.raise_for_status()
    result = r.json()
    if result.get("error"):
        raise Exception(result["error"])
    return result["result"]


def execute(uid, model, method, domain=None, fields=None):
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "service": "object",
            "method": "execute_kw",
            "args": [
                DB,
                uid,
                API_KEY,
                model,
                method,
                domain or [],
                {"fields": fields or [], "limit": 5000}
            ]
        },
        "id": 1
    }
    r = requests.post(JSONRPC, json=payload, timeout=120)
    r.raise_for_status()
    result = r.json()
    if result.get("error"):
        raise Exception(result["error"])
    return result["result"]


def main():
    uid = authenticate()
    if not uid:
        raise Exception("AUTH FAILED")

    print("[OK] AUTH UID:", uid)

    # 1. Все кастомные модели x_*
    custom_models = execute(
        uid,
        "ir.model",
        "search_read",
        [[["model", "ilike", "x_%"]]],
        ["model", "name"]
    )

    # 2. Ключевые системные модели
    target_models = [
        "res.partner",
        "website.page",
        "website.menu",
        "ir.ui.view"
    ]

    core_models = execute(
        uid,
        "ir.model",
        "search_read",
        [[["model", "in", target_models]]],
        ["model", "name"]
    )

    all_models = {m["model"]: m for m in (custom_models + core_models)}

    fields_map = {}

    for model_name in all_models:
        print("Dump fields:", model_name)
        fields = execute(
            uid,
            "ir.model.fields",
            "search_read",
            [[["model", "=", model_name]]],
            ["name", "field_description", "ttype", "relation", "required", "readonly", "store", "index"]
        )
        fields_map[model_name] = fields

    output = {
        "meta": {
            "odoo_url": ODOO_URL,
            "db": DB,
            "custom_models_count": len(custom_models),
            "total_models_dumped": len(all_models)
        },
        "models": list(all_models.values()),
        "fields_by_model": fields_map
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("\n[OK] Inventory saved to", OUT_FILE)
    print("[OK] Custom models:", len(custom_models))
    print("[OK] Total models:", len(all_models))


if __name__ == "__main__":
    main()