
from flask import Flask, jsonify, render_template
from flask_cors import CORS
from hackMate import fetch_devfolio_hackathons, fetch_hackclub_hackathons, fetch_devpost_hackathons  # Import your function
import time

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)
# ✅ Cache hackathons to speed up loading
hackathon_cache = {"data": [], "timestamp": 0}
CACHE_DURATION = 60 * 10  # Cache for 10 minutes

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/hackathons', methods=['GET'])
def get_hackathons():
    current_time = time.time()

    # ✅ Use cache if data is fresh
    if hackathon_cache["data"] and (current_time - hackathon_cache["timestamp"] < CACHE_DURATION):
        print("✅ Serving cached hackathons")
        return jsonify(hackathon_cache["data"])

    # 🕒 Otherwise, fetch new data
    print("⏳ Fetching fresh hackathon data...")

    # Fetch hackathons from all sources
    devfolio_hackathons = fetch_devfolio_hackathons()
    hackclub_hackathons = fetch_hackclub_hackathons()
    devpost_hackathons = fetch_devpost_hackathons()

    # # Fetch live Devpost hackathons
    # import requests
    # try:
    #     devpost_live = requests.get(
    #         "https://devpost.com/api/hackathons?status=live&per_page=20&page=1"
    #     ).json().get("hackathons", [])
    #     print("Fetched live Devpost hackathons:", len(devpost_live))
    # except Exception as e:
    #     print("Error fetching live devpost hackathons:", e)
    #     devpost_live = []

    # # Fetch past Devpost hackathons (ended)
    # try:
    #     devpost_past = requests.get(
    #         "https://devpost.com/api/hackathons?status=ended&per_page=20&page=1"
    #     ).json().get("hackathons", [])
    #     print("Fetched past Devpost hackathons:", len(devpost_past))
    # except Exception as e:
    #     print("Error fetching past devpost hackathons:", e)
    #     devpost_past = []

    # # Merge live, upcoming, and past
    # if devpost_hackathons is None:
    #     devpost_hackathons = []
    # devpost_hackathons = devpost_live + devpost_hackathons + devpost_past

    # If no live hackathons found, optionally add trusted dummy live hackathons here (not shown in this snippet)

     # Debugging: Print fetched hackathons
    print("Raw Devfolio Hackathons:", devfolio_hackathons)
    print("Raw HackClub Hackathons:", hackclub_hackathons)
    print("Raw Devpost Hackathons:", devpost_hackathons)

    # Handle None case for HackClub
    if hackclub_hackathons is None:
        print("HackClub hackathons is None! Something went wrong.")
        hackclub_hackathons = []

    # Ensure we don't overwrite valid data
    if not hackclub_hackathons:
        print("Warning: HackClub API returned no data!")
        hackclub_hackathons = []

    # Handle None case
    """
    if hackclub_hackathons is None:
        return jsonify({"error": "No HackClub hackathons found"}), 500  # Or return an empty list

    """
    
    # Initialize final list and seen hackathons set
    all_hackathons = []
    seen_hackathons = set()

    # Format Devfolio hackathons
    for hackathon in devfolio_hackathons or []:
        if "name" in hackathon and "hackathon_setting" in hackathon and isinstance(hackathon["hackathon_setting"], dict) and "site" in hackathon["hackathon_setting"]:
            name = hackathon["name"]
            url = hackathon["hackathon_setting"]["site"]

            # New fields
            start_date = hackathon.get("starts_at", "No Date")
            end_date = hackathon.get("ends_at", "No End Date")
            # Event status
            status = "Upcoming"
            try:
                from dateutil import parser
                now = parser.parse(start_date) if start_date != "No Date" else None
                end = parser.parse(end_date) if end_date != "No End Date" else None
                import datetime
                now_utc = datetime.datetime.utcnow()
                if now and now > now_utc:
                    status = "Upcoming"
                elif end and now_utc > end:
                    status = "Completed"
                elif now and end and now_utc >= now and now_utc <= end:
                    status = "Ongoing"
            except Exception:
                pass
            if url and (name, url) not in seen_hackathons:
                seen_hackathons.add((name, url))
                all_hackathons.append({
                    "name": name,
                    "date": start_date,  # for backward compatibility
                    "start_date": start_date,
                    "url": url,
                    "source": "Devfolio",
                    
                })
        else:
            print(f"Skipping Devfolio hackathon due to missing data: {hackathon}")
            seen_hackathons.add((name, url))

    # Format HackClub hackathons
    for hackathon in hackclub_hackathons or []:
        if "name" in hackathon and "website" in hackathon:
            name = hackathon["name"]
            url = hackathon["website"]

            # New fields
            start_date = hackathon.get("start", "No Date")
            end_date = hackathon.get("end", "No End Date")
            # Event status
            status = "Upcoming"
            try:
                from dateutil import parser
                now = parser.parse(start_date) if start_date != "No Date" else None
                end = parser.parse(end_date) if end_date != "No End Date" else None
                import datetime
                now_utc = datetime.datetime.utcnow()
                if now and now > now_utc:
                    status = "Upcoming"
                elif end and now_utc > end:
                    status = "Completed"
                elif now and end and now_utc >= now and now_utc <= end:
                    status = "Ongoing"
            except Exception:
                pass
            if url and (name, url) not in seen_hackathons:
                seen_hackathons.add((name, url))
                all_hackathons.append({
                    "name": name,
                    "date": start_date,  # for backward compatibility
                    "start_date": start_date,
                    "url": url,
                    "source": "HackClub",
                })
        else:
            print(f"Skipping HackClub hackathon due to missing data: {hackathon}")
            seen_hackathons.add((name, url))

    # Format Devpost hackathons
    for hackathon in devpost_hackathons or []:
        if "title" in hackathon and "url" in hackathon:
            name = hackathon["title"]
            url = hackathon["url"]

            # New fields
            start_date = hackathon.get("start_date", hackathon.get("submission_deadline", "No Date"))
            end_date = hackathon.get("end_date", "No End Date")
            # Event status
            status = "Upcoming"
            try:
                from dateutil import parser
                now = parser.parse(start_date) if start_date != "No Date" else None
                end = parser.parse(end_date) if end_date != "No End Date" else None
                import datetime
                now_utc = datetime.datetime.utcnow()
                if now and now > now_utc:
                    status = "Upcoming"
                elif end and now_utc > end:
                    status = "Completed"
                elif now and end and now_utc >= now and now_utc <= end:
                    status = "Ongoing"
            except Exception:
                pass
            if url and (name, url) not in seen_hackathons:
                seen_hackathons.add((name, url))
                all_hackathons.append({
                    "name": name,
                    "date": start_date,  # for backward compatibility
                    "start_date": start_date,
                    "url": url,
                    "source": "Devpost",
                    
                })
        else:
            print(f"Skipping Devpost hackathon due to missing data: {hackathon}")
            seen_hackathons.add((name, url))

    # Debugging: Print final hackathons list before returning
    print("Final Hackathons list:", all_hackathons)
    print("Total Hackathons count:", len(all_hackathons))
    print("Total Unique Hackathons:", len(seen_hackathons))

     # ✅ Save data in cache
    hackathon_cache["data"] = all_hackathons
    hackathon_cache["timestamp"] = time.time()


    return jsonify(all_hackathons)

if __name__ == '__main__':
    app.run(debug=True)
