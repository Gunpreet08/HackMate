import requests
import time
import re
from datetime import datetime, timedelta
from datetime import datetime, timezone
from selenium import webdriver
from dateutil import parser  # Install using `pip install python-dateutil`
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

# Function to format date properly
def format_date(iso_date):
    try:
        return datetime.strptime(iso_date, "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%d %B %Y, %I:%M %p")
    except:
        return iso_date  # Return as is if there's an error

# Fetch Devfolio Hackathons (All Pages Dynamically)
def fetch_devfolio_hackathons():
    hackathons = []
    base_url = "https://api.devfolio.co/api/hackathons?filter=all&page="
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }

    page = 1
    max_retries = 3  # Retry up to 3 times
    while page <= max_retries: #True:
        try:
            response = requests.get(base_url + str(page), headers=headers, timeout=10)
            response.raise_for_status()  # Raises an error for non-200 status codes

            data = response.json()  # Convert response to JSON
            if not data.get("result"):
                break
            hackathons.extend(data["result"])
            page += 1
        except requests.exceptions.RequestException as e:
            print(f"❌ Devfolio API Error (Attempt {page}/{max_retries}): {e}")
            time.sleep(2)  # Wait before retrying
            page += 1


    # ✅ Filter upcoming hackathons based on date
    current_date = datetime.now(timezone.utc)
    upcoming_hackathons = [
        h for h in hackathons if "starts_at" in h and parser.parse(h["starts_at"]).astimezone(timezone.utc) > current_date
    ]

    return upcoming_hackathons


# Display Devfolio Hackathons
def display_devfolio_hackathons():
    devfolio_hackathons = fetch_devfolio_hackathons()

    if devfolio_hackathons:
        print("\n🚀 Upcoming Devfolio Hackathons 🚀\n")
        for event in devfolio_hackathons:
            name = event.get('name', 'No Title')
            date_str = event.get('starts_at', '')
            

            # Convert date using dateutil.parser for better flexibility
            try:
                readable_date = parser.parse(date_str).strftime('%B %d, %Y %I:%M %p')
            except (ValueError, TypeError):
                readable_date = "Invalid Date"

            slug = event.get('slug', '')
            url = f"https://{slug}.devfolio.co" if slug else "No URL Available"
            


            print(f"🏆 {name}")
            print(f"📅 Date: {readable_date}")
            print(f"🔗 URL: {url}\n")
    else:
        print("❌ No Devfolio hackathons found!")




# Fetch hackathons from HackClub API
def fetch_hackclub_hackathons():
    hackclub_url = "https://hackathons.hackclub.com/api/events/upcoming"

    try:
        response = requests.get(hackclub_url)

        if response.status_code == 200:
            hackathons = response.json()

            if isinstance(hackathons, list):
                print("\n🔥 HackClub Hackathons 🔥\n")
                for event in hackathons:
                    print(f"🏆 Hackathon: {event.get('name', 'No Name')}")
                    print(f"🔗 Website: {event.get('website', 'No Website')}")
                    print(f"📅 Start Date: {format_date(event.get('start', 'No Date'))}")
                    print("-" * 50)
                return hackathons  # ✅ Return data 
            else:
                print("⚠ Unexpected HackClub API response format:", hackathons)
        else:
            print(f"❌ HackClub API Error {response.status_code}: {response.text}")
    except Exception as e:
        print("❌ Exception Occurred while fetching HackClub data:", e)
    return []  # Return empty list on error


def estimate_deadline_from_text(text):
    """Convert '26 days left' or 'about 1 month left' → actual date"""
    text = text.lower()

    match_days = re.search(r"(\d+)\s+days?\s+left", text)
    match_months = re.search(r"about\s+(\d+)\s+month", text)
    match_weeks = re.search(r"about\s+(\d+)\s+week", text)

    now = datetime.now()

    if match_days:
        days = int(match_days.group(1))
        return (now + timedelta(days=days)).isoformat()
    elif match_weeks:
        weeks = int(match_weeks.group(1))
        return (now + timedelta(weeks=weeks)).isoformat()
    elif match_months:
        months = int(match_months.group(1))
        # Rough approximation: 30 days per month
        return (now + timedelta(days=30 * months)).isoformat()
    else:
        return None  # Could not estimate

# Fetch Devpost hackathons using Selenium
def fetch_devpost_hackathons():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    url = "https://devpost.com/hackathons"
    driver.get(url)
    time.sleep(5)

    hackathons = []
    tiles = driver.find_elements(By.CLASS_NAME, "hackathon-tile")
    for hackathon in tiles[:5]:
        try:
            title = hackathon.find_element(By.TAG_NAME, "h3").text.strip()
            link = hackathon.find_element(By.TAG_NAME, "a").get_attribute("href")
            deadline_element = hackathon.find_element(By.CLASS_NAME, "hackathon-status")
            deadline_text = deadline_element.text.strip()
            estimated_deadline = estimate_deadline_from_text(deadline_text)
            
            hackathons.append({
                    "title": title,
                    "url": link,
                    "submission_deadline": estimated_deadline or "Unknown",
                    
                })
        except Exception as e:
            print("⚠ Error extracting a hackathon:", e)
    driver.quit()
    return hackathons  # ✅ Return parsed data


# Main function to run the script
if __name__ == "__main__":
    display_devfolio_hackathons()
    fetch_hackclub_hackathons()
    fetch_devpost_hackathons()


