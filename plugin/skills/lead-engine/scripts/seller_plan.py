"""Render a seller's next discovery actions offline. The assistant executes permitted actions."""
import argparse
import json
import math
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
    if re.search(r"\b(?:enrich|verify|clean|validate)\b[^.!?]{0,45}\b(?:list|csv|spreadsheet|uploaded contacts|existing leads)\b", brief, re.I):
        return "enrich"
    if re.search(r"\b(?:i|we)(?:'re|’re| are|'m| am)?\s+(?:looking to hire|want to hire|need to hire|hiring|recruiting)|\b(?:our vacancy|join our team|we can hire)\b", brief, re.I):
        return "hire"
    need = re.search(r"\b(?:i|we) need (?:an? |someone to )([^.!?]{1,60}?)\s+for (?:our|my|an? (?:paid )?project)\b", brief, re.I)
    if need and not re.search(r"\b(?:list|customers?|buyers?|prospects?|leads?|clients?)\b", need[1], re.I):
        return "hire"
    if re.search(r"\b(?:clients?|customers?|buyers?|commissions?|prospects?|leads?)\b", brief, re.I):
        return "sell"
    if re.fullmatch(r"(?:find|show|get) (?:me )?(?:[\w-]+ ){0,3}[\w-]+s[.!?]?", brief, re.I):
        return "ambiguous"
    return "sell"


def offer_clause(brief):
    """Split a plain seller sentence without turning the buyer or geography into a product."""
    match = re.search(r"\b(?:i|we)\s+(sell|supply|make|offer|provide|build|design|translate|edit|produce|create|verify)"
                      r"\s+([^.!?;]+)", brief, re.I)
    if not match:
        match = re.search(r"\b(?:my|our) (product|service|software) is\s+([^.!?;]+)", brief, re.I)
    if not match:
        return "", "", "", ""
    verb, description = match.groups()
    verb = verb.casefold()
    parts = re.split(r"\s+(?:to|for)\s+", description, maxsplit=1, flags=re.I)
    item, audience = parts[0].strip(), parts[1].strip() if len(parts) == 2 else ""
    if re.match(r"(?:make|build|improve|sell|edit|help|hire)\b", audience, re.I):
        return "", "", "", ""
    group, _, place = re.sub(r"\s+in\s+", " | ", audience, flags=re.I, count=1).partition(" | ")
    software = re.search(r"\b(?:software|saas|app|platform)\b", item, re.I)
    sale_type = "software" if software or verb == "software" else "product" if verb in {"sell", "supply", "make", "product"} else "service"
    if sale_type != "software" and re.search(r"\b(?:services?|bookkeeping|accounting|editing|verification|consulting|coaching|training|support|design|translation|photography|copywriting|promotional videos?|video production)\b", item, re.I):
        sale_type = "service"
    deliverable = item if verb in {"sell", "supply", "offer", "provide", "make", "product", "software", "service"} else verb + " " + item
    return deliverable.strip(), group.strip(), place.strip(), sale_type


def buyer_target(brief):
    """Capture a stated target and place. The assistant can supply more complex constraints."""
    match = re.search(r"\b(?:only pitch|i pitch|targeting|my customers are|my buyers are|find)\s+([^.!?;]+)", brief, re.I)
    if not match:
        return "", ""
    text = re.split(r"\s+(?:that may buy|i can pitch|only if|with a budget|under \$|who need)\b",
                    match[1], maxsplit=1, flags=re.I)[0]
    parts = re.split(r"\s+in\s+", text, maxsplit=1, flags=re.I)
    target = re.sub(r"^(?:me\s+)?(?:up to\s+)?\d[\d,]*\s+", "", parts[0].strip(), flags=re.I)
    if re.fullmatch(r"(?:(?:me|us|new|some|more|qualified|potential|paying|ideal)\s+)*(?:leads?|clients?|customers?|buyers?|prospects?|work|opportunities)", target, re.I):
        target = ""
    return target, parts[1].strip() if len(parts) == 2 else ""


def profile_for(catalog, opening, selected):
    profiles = catalog["professions"] + catalog.get("archetypes", [])
    explicit = next((profile for profile in profiles if profile["id"] == selected), None)
    if explicit:
        return explicit
    matches = [(len(alias), profile) for profile in profiles for alias in profile["aliases"]
               if re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", opening, re.I)]
    return max(matches, key=lambda item: item[0])[1] if matches else catalog["fallback"]


LANGUAGES = {"english": "en", "french": "fr", "german": "de", "spanish": "es",
             "portuguese": "pt", "italian": "it", "japanese": "ja"}
COUNTRIES = {"canada": "CA", "united states": "US", "usa": "US", "united kingdom": "GB",
             "australia": "AU", "germany": "DE", "france": "FR", "spain": "ES", "japan": "JP"}
SOCIAL = {"youtube": "youtube.com", "reddit": "reddit.com", "x": "x.com", "tiktok": "tiktok.com",
          "facebook": "facebook.com", "threads": "threads.com", "bluesky": "bsky.app",
          "linkedin": "linkedin.com", "instagram": "instagram.com"}
PUBLIC_SITES = {**SOCIAL, "twine": "twine.net", "upwork": "upwork.com", "contra": "contra.com",
                "vimeo": "vimeo.com", "behance": "behance.net", "dribbble": "dribbble.com"}
NEGATIVE = r"\b(?:no|not|skip|avoid|exclude|excluding|except|without|never|don't|don’t|do not)\b"
SCOPE_BREAK = r"[,;.!?\n]|\b(?:but|instead)\b|\band\s+(?=(?:no|not|exclude|skip|only|use)\b)"
BUYING_TERMS = {
    "es": {"service": '("buscamos" OR "se busca" OR "necesitamos")', "product": '("buscamos proveedor" OR "solicitud de cotización")', "software": '("buscamos software" OR "recomiendan una herramienta")'},
    "fr": {"service": '("recherche" OR "nous cherchons")', "product": '("cherche fournisseur" OR "demande de devis")', "software": '("recherche un logiciel" OR "recommandez un outil")'},
    "de": {"service": '("wir suchen" OR "gesucht")', "product": '("Lieferant gesucht" OR "Angebotsanfrage")', "software": '("Software gesucht" OR "Software Empfehlung")'},
    "pt": {"service": '("procuramos" OR "precisamos")', "product": '("busco fornecedor" OR "pedido de cotação")', "software": '("busco software" OR "recomendam uma ferramenta")'},
    "it": {"service": '("cerchiamo" OR "cercasi")', "product": '("cerco fornitore" OR "richiesta di preventivo")', "software": '("cerco software" OR "consigliate uno strumento")'},
    "ja": {"service": '("募集中" OR "募集")', "product": '("仕入先" OR "見積依頼")', "software": '("ソフトを探しています" OR "ツールのおすすめ")'},
}


def mentioned_code(text, codes):
    for clause in re.split(SCOPE_BREAK, text, flags=re.I):
        positive = re.split(NEGATIVE, clause, maxsplit=1, flags=re.I)[0]
        for term, code in codes.items():
            if re.search(r"\b" + re.escape(term) + r"\b", positive, re.I):
                return code
    return ""


def source_scope(brief):
    terms = "|".join([*PUBLIC_SITES, "twitter", "maps"])
    only, excluded = set(), set()
    for sentence in re.split(SCOPE_BREAK, brief.lower()):
        for part in re.split(r"\s+(?=" + NEGATIVE + ")", sentence):
            names = {"x" if name == "twitter" else name for name in
                     re.findall(r"\b(" + terms + r")\b", part)}
            if not names:
                continue
            if re.search(NEGATIVE, part):
                excluded |= names
            elif re.search(r"\b(?:only|exclusively)\b", part) or re.search(r"\bfind\b.*\byoutube\b", part):
                only |= names
    return only, excluded


def requested_window(text):
    match = re.search(r"\b(?:last|past|previous)\s+(\d+|one|two)\s+(hours?|days?|weeks?)\b", text, re.I)
    if not match:
        return (1, 24) if re.search(r"\b(?:posted today|today only|past day)\b", text, re.I) else (14, None)
    number = int({"one": "1", "two": "2"}.get(match[1].lower(), match[1]))
    hours = number * (168 if match[2].lower().startswith("week") else 24 if match[2].lower().startswith("day") else 1)
    return max(1, math.ceil(hours / 24)), hours


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

    website_match = re.search(r"https?://[^\s<>]+", raw, re.I)
    website = website_match[0].rstrip(".,;!?)") if website_match else None
    description = re.sub(r"https?://[^\s<>]+", ". ", raw, flags=re.I)
    identity = re.search(r"\b(?:i am|i['’]m|we are|we['’]re|i run)\s+([^.!?;]+)", description, re.I)
    opening = identity[0] if identity else description
    opening = re.split(r"[.!?;]|\s+(?:targeting|for clients|to companies|i (?:only )?pitch)\b",
                       opening, maxsplit=1, flags=re.I)[0].strip()
    deliverable, audience, area, sale_type = offer_clause(description)
    bare = re.sub(r"^(?:i(?: am|'m|’m)|we are|i run|i sell|i offer|i provide)\s+(?:an?\s+)?",
                  "", opening, flags=re.I).strip()
    profile = profile_for(catalog, deliverable or opening, answers.get("profile"))
    workspace = {"tool": "seller_project", "arguments": {"operation": {"action": "list"}}}
    if website and not deliverable and not identity and not answers.get("offer") and profile == catalog["fallback"]:
        return {"intent": "read_website", "brief": raw, "website": website, "sellerWorkspace": workspace,
                "next": "Read the seller’s website and infer the offer and purchasing organizations from its visible evidence.",
                "methods": []}
    if profile == catalog["fallback"] and not answers.get("offer") and (len(bare) < 3 or bare.casefold() in OPAQUE):
        return {"intent": "clarify_offer", "brief": raw,
                "question": "What do clients pay you to make, supply or improve?", "methods": []}
    offer = answers.get("offer") or deliverable or profile.get("offer") or bare
    target, place = buyer_target(raw)
    if not target and not audience and identity:
        identity_parts = re.split(r"\s+(?:for|serving)\s+", identity[1], maxsplit=1, flags=re.I)
        if len(identity_parts) == 2 and not re.match(r"(?:hire|work|a living)\b", identity_parts[1], re.I):
            audience_parts = re.split(r"\s+in\s+", identity_parts[1], maxsplit=1, flags=re.I)
            audience = audience_parts[0].strip()
            area = audience_parts[1].strip() if len(audience_parts) == 2 else ""
    target, place = target or audience, place or area
    segments = answers.get("segments") or profile.get("segments", [])
    if answers.get("segment") or target:
        segments = [answers.get("segment") or target]
    service = answers.get("serviceTerm") or deliverable or profile.get("serviceTerm") or bare
    if not answers.get("serviceTerm") and (re.search(r"\b(?:audio[ -]only|only (?:edit|produce) audio)\b", raw, re.I)
            or (re.search(r"\bpodcast edit", raw, re.I) and re.search(r"\b(?:no video|don't edit video|audio,? not video)\b", raw, re.I))):
        service = "audio editor" if re.search(r"\bedit", raw, re.I) else "audio production"
        if not answers.get("offer"):
            offer = service
    sale = answers.get("saleType") or sale_type or profile.get("saleType") or "service"
    if sale not in catalog["requestQueries"]:
        raise ValueError("Choose service, product or software.")
    role = answers.get("role") or profile.get("role", "")
    limits = ". ".join(filter(None, [raw, answers.get("constraints")]))
    country = answers.get("country") or mentioned_code(limits, COUNTRIES)
    market = answers.get("market") or place
    context = {"serviceTerm": service, "segment": next(iter(segments), ""), "role": role,
               "market": market, "country": country.upper(), "countryLower": country.lower(),
               "language": answers.get("language") or mentioned_code(limits, LANGUAGES), "channelTopic": answers.get("channelTopic")
               or profile.get("channelTopic", "")}
    allowed = set(profile["methods"]).intersection(answers.get("allowedMethods", profile["methods"]))
    only, excluded = source_scope(limits)
    no_social = re.search(r"\b(?:no|avoid|exclude|skip) social(?: media)?\b", limits, re.I)
    if no_social:
        excluded.update(SOCIAL)
    if re.search(r"\b(?:only (?:active |open )?(?:buyer requests|commissions)|no cold (?:leads|prospects))\b", limits, re.I):
        allowed.intersection_update({"public-request"})
    platforms = only - excluded
    public_platforms = [name for name in PUBLIC_SITES if name in platforms and name != "youtube"]
    unknown_exclusive = re.search(r"\b(?:only (?:search|use|check)(?: on)?|(?:search|look|check) (?:only|exclusively)(?: on| at)?|(?:only|exclusively) on)\s+([\w.-]+)", limits, re.I)
    if unknown_exclusive and unknown_exclusive[1].lower().rstrip(".") not in {*PUBLIC_SITES, "google", "twitter", "maps", "the", "public", "open", "buyer", "my"} and not only:
        allowed.clear()
    if only:
        possible = set()
        if public_platforms:
            possible.add("public-request")
        if "youtube" in platforms:
            possible.add("channel-fit")
        if "maps" in platforms:
            possible.update({"maps-site", "retail-assortment"})
        allowed &= possible
    if "youtube" in excluded:
        allowed.discard("channel-fit")
    if "maps" in excluded:
        allowed.difference_update({"maps-site", "retail-assortment"})
    included_only = bool(re.search(r"\b(?:free|included) (?:sources?|search(?:es)?) only\b|\b(?:only (?:use|search) (?:free|included)|no paid (?:sources?|search(?:es)?)|(?:do not|don't) spend)\b", limits, re.I))
    if included_only:
        allowed.intersection_update({"public-request", "channel-fit"} if "youtube" in only else {"public-request"})
    count_match = re.search(r"\b(?:find|show|get|return|give)\s+(?:me\s+)?(?:up to\s+)?(-?\d[\d,]*)\b", limits, re.I)
    count = answers.get("count") or (int(count_match[1].replace(",", "")) if count_match else None)
    if count is not None and not 1 <= count <= 1000:
        return {"intent": "sell", "brief": raw, "methods": [], "next": "Choose a count from 1 to 1,000 for this search."}
    days, hours = requested_window(limits)
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
        if method_id == "channel-fit" and (missing or included_only) and "youtube" in only:
            query = " ".join(filter(None, ["site:youtube.com", context["channelTopic"] or service,
                                            context["market"], context["language"]]))
            action = {"mode": "host_public_search", "query": query,
                      "requires": "Included public search. If unavailable, ask which missing market or language to use for the Actor."}
            missing = []
        if action and method_id == "public-request":
            language = context["language"].lower()
            query = render(catalog["requestQueries"][sale], context)
            if language in BUYING_TERMS:
                query = " ".join(filter(None, [BUYING_TERMS[language][sale], service, market]))
            explicit_segment = answers.get("segment") or next(iter(answers.get("segments", [])), "") or target
            if explicit_segment and explicit_segment.lower() not in query.lower():
                query += " " + explicit_segment
            if only:
                query = "(" + " OR ".join("site:" + PUBLIC_SITES[name] for name in public_platforms) + ") " + query
            else:
                query = " ".join([query, *["-site:" + PUBLIC_SITES[name] for name in sorted(excluded) if name in PUBLIC_SITES]])
            action.update(query=query, alternateQuery=query if only or "reddit" in excluded else "site:reddit.com " + query,
                          recencyDays=days)
            if hours is not None:
                action["maxOriginalAgeHours"] = hours
            if language:
                action["language"] = language
            if answers.get("role"):
                action["buyerRole"] = answers["role"]
        if action and count is not None:
            arguments = action.get("arguments", {})
            if action.get("tool") == "route_leads":
                arguments.setdefault("filters", {})["count"] = count
            if "count" in arguments:
                arguments["count"] = count
            if "maxChannels" in arguments:
                arguments["maxChannels"] = min(50, count)
                if count > 50:
                    action["limitNotice"] = f"This source can quote 50 channels per search. You requested {count}."
            if action.get("tool") == "plan_google_prospecting":
                arguments["maxResults"] = min(10, count)
                if count > 10:
                    action["limitNotice"] = f"This source can quote 10 organic results per search. You requested {count}."
            if action.get("mode") == "host_public_search":
                action["requestedCount"] = count
        methods.append({**method, "action": action, "missing": missing,
                        "fallback": method["fallback"] if method["fallback"] in allowed else None})
    return {"sellerWorkspace": workspace, "website": website,
            "next": "Review the dated original and the buyer’s invited reply route." if methods else
                    "No search matches the allowed sources. Specify an available source or paste the buyer’s original link.",
            "intent": "sell", "brief": raw, "profile": profile["id"], "offer": offer,
            "saleType": sale, "buyerHypotheses": segments, "role": role,
            "assistantInference": "" if segments else catalog["fallback"]["requiresInference"],
            "explicitConstraints": limits, "methods": methods}


if __name__ == "__main__":
    cmd = argparse.ArgumentParser(description=__doc__)
    cmd.add_argument("brief")
    cmd.add_argument("--answers", type=json.loads, default={})
    args = cmd.parse_args()
    print(json.dumps(build(args.brief, args.answers), indent=2, ensure_ascii=False))
