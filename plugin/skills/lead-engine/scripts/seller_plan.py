"""Render a seller's next discovery actions offline. The assistant executes permitted actions."""
import argparse
import json
import re
from pathlib import Path

MAP = Path(__file__).resolve().parents[1] / "references" / "seller-methods.json"
TEXT_FIELDS = {"profile", "offer", "serviceTerm", "segment", "role", "market", "country",
               "language", "channelTopic", "intent", "constraints", "saleType"}
LIST_FIELDS = {"segments", "allowedMethods"}
NEEDS = {"maps-site": ["market"], "retail-assortment": ["market"],
         "organic-fit": ["market", "country", "language"],
         "channel-fit": ["country", "language", "channelTopic"]}
OPAQUE = {"xyz", "abc", "consultant", "freelancer", "entrepreneur",
          "agency owner", "founder", "business owner"}


def render(value, context):
    if isinstance(value, str):
        return re.sub(r"\{(\w+)\}", lambda match: context.get(match[1], ""), value).strip()
    if isinstance(value, list):
        return [render(item, context) for item in value]
    if isinstance(value, dict):
        return {key: result for key, item in value.items() if (result := render(item, context)) != ""}
    return value


def infer_intent(brief):
    if re.search(r"\b(?:enrich|verify|clean)\b.{0,45}\b(?:list|csv|contacts|emails)\b", brief, re.I):
        return "enrich"
    if re.search(r"\b(?:i|we)(?:'re|’re| are|'m| am)?\s+(?:looking to hire|want to hire|need to hire|hiring|recruiting)|\b(?:our vacancy|join our team|we can hire)\b", brief, re.I):
        return "hire"
    if re.fullmatch(r"(?:find|show|get) (?:me )?(?:[\w-]+ ){0,3}[\w-]+s[.!?]?", brief, re.I):
        return "ambiguous"
    return "sell"


def buyer_target(brief):
    """Capture a stated target and place. The assistant can supply more complex constraints."""
    match = re.search(r"\b(?:only pitch|i pitch|targeting|my customers are|my buyers are|find)\s+([^.!?;]+)", brief, re.I)
    if not match:
        return "", ""
    text = re.split(r"\s+(?:that may buy|i can pitch|only if|with a budget|under \$|who need)\b",
                    match[1], maxsplit=1, flags=re.I)[0]
    parts = re.split(r"\s+in\s+", text, maxsplit=1, flags=re.I)
    return parts[0].strip(), parts[1].strip() if len(parts) == 2 else ""


def profile_for(catalog, opening, selected):
    profiles = catalog["professions"] + catalog.get("archetypes", [])
    explicit = next((profile for profile in profiles if profile["id"] == selected), None)
    if explicit:
        return explicit
    matches = [(len(alias), profile) for profile in profiles for alias in profile["aliases"]
               if re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", opening, re.I)]
    return max(matches, key=lambda item: item[0])[1] if matches else catalog["fallback"]


def build(brief, answers=None, catalog=None):
    answers = answers or {}
    if not isinstance(answers, dict) or set(answers) - TEXT_FIELDS - LIST_FIELDS - {"count"}:
        raise ValueError("Unknown seller fields.")
    if any(not isinstance(answers[k], str) for k in TEXT_FIELDS & answers.keys()):
        raise ValueError("Supply text for seller fields.")
    if any(not isinstance(answers[k], list) or any(not isinstance(x, str) for x in answers[k])
           for k in LIST_FIELDS & answers.keys()):
        raise ValueError("Supply text arrays for segments and allowedMethods.")
    if "count" in answers and (type(answers["count"]) is not int or not 1 <= answers["count"] <= 1000):
        raise ValueError("Use a positive supported count.")
    catalog = catalog or json.loads(MAP.read_text())
    raw = brief.strip()
    if not raw or len(raw) > 2000:
        raise ValueError("Supply a brief between 1 and 2000 characters.")
    intent = answers.get("intent") or infer_intent(raw)
    if intent not in {"sell", "hire", "enrich", "ambiguous"}:
        raise ValueError("Unknown intent.")
    if intent != "sell":
        next_step = {"hire": "Continue with the requested hiring criteria.",
                     "enrich": "Use the existing list enrichment workflow.",
                     "ambiguous": "Are you hiring someone or looking for clients for your own work?"}
        return {"intent": intent, "brief": raw, "next": next_step[intent], "methods": []}

    opening = re.split(r"[.!?;]|\s+(?:targeting|for clients|to companies|i (?:only )?pitch)\b",
                       raw, maxsplit=1, flags=re.I)[0]
    bare = re.sub(r"^(?:i(?: am|'m|’m)|we are|i run|i sell|i offer|i provide)\s+(?:an?\s+)?",
                  "", opening, flags=re.I).strip()
    profile = profile_for(catalog, opening, answers.get("profile"))
    if profile == catalog["fallback"] and not answers.get("offer") and (len(bare) < 3 or bare.casefold() in OPAQUE):
        return {"intent": "clarify_offer", "brief": raw,
                "question": "What do clients pay you to make, supply or improve?", "methods": []}
    offer = answers.get("offer") or profile.get("offer") or bare
    target, place = buyer_target(raw)
    segments = answers.get("segments") or profile.get("segments", [])
    if answers.get("segment") or target:
        segments = [answers.get("segment") or target]
    service = answers.get("serviceTerm") or profile.get("serviceTerm") or bare
    sale = answers.get("saleType") or profile.get("saleType") or "service"
    if sale not in catalog["requestQueries"]:
        raise ValueError("Choose service, product or software.")
    role = answers.get("role") or profile.get("role", "")
    country = answers.get("country", "")
    market = answers.get("market") or place
    context = {"serviceTerm": service, "segment": next(iter(segments), ""), "role": role,
               "market": market, "country": country.upper(), "countryLower": country.lower(),
               "language": answers.get("language", ""), "channelTopic": answers.get("channelTopic")
               or profile.get("channelTopic", "")}
    allowed = set(answers.get("allowedMethods", profile["methods"]))
    if re.search(r"\b(?:no|avoid|exclude) social(?: media)?\b", raw, re.I):
        allowed.difference_update({"public-request", "channel-fit"})
    if re.search(r"\b(?:only (?:active |open )?(?:buyer requests|commissions)|no cold (?:leads|prospects))\b", raw, re.I):
        allowed.intersection_update({"public-request"})
    methods = []
    by_id = {item["id"]: item for item in catalog["methods"]}
    for method_id in profile["methods"]:
        if method_id not in allowed:
            continue
        method = by_id[method_id]
        missing = [key for key in NEEDS.get(method_id, []) if not context[key]]
        if method_id in {"business-fit", "maps-site", "organic-fit", "retail-assortment"} and not segments:
            missing.append("assistantInferredBuyerSegments")
        action = None if missing else render(method["action"], context)
        if action and method_id == "public-request":
            action["query"] = render(catalog["requestQueries"][sale], context)
            action["alternateQuery"] = "site:reddit.com " + action["query"]
        if action and answers.get("count"):
            arguments = action.get("arguments", {})
            if "count" in arguments:
                arguments["count"] = answers["count"]
            if "maxChannels" in arguments:
                arguments["maxChannels"] = min(10, answers["count"])
        methods.append({**method, "action": action, "missing": missing})
    return {"intent": "sell", "brief": raw, "profile": profile["id"], "offer": offer,
            "saleType": sale, "buyerHypotheses": segments, "role": role,
            "assistantInference": "" if segments else catalog["fallback"]["requiresInference"],
            "explicitConstraints": answers.get("constraints") or raw, "methods": methods}


if __name__ == "__main__":
    cmd = argparse.ArgumentParser(description=__doc__)
    cmd.add_argument("brief")
    cmd.add_argument("--answers", type=json.loads, default={})
    args = cmd.parse_args()
    print(json.dumps(build(args.brief, args.answers), indent=2, ensure_ascii=False))
