import { NextRequest } from "next/server";


const API_URL = process.env.ACTIVECAMPAIGN_API_URL ?? '';
const API_KEY = process.env.ACTIVECAMPAIGN_API_KEY ?? '';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const automationID = searchParams.get("automationID");

    if (!automationID) {
        return new Response("Automation ID is required", { status: 400 });
    }
    console.log("[API] Getting contacts for automation: ", automationID);

    // Fetch automation details to get the contacts URL
    const automationDetails = await getAutomationDetails(automationID);
    if (!automationDetails) {
        return new Response("Automation not found", { status: 404 });
    }

    console.log("[API] Automation details: ", automationDetails);
    const contacts = await getContactsForAutomation(automationID);
    if (!contacts) {
        return new Response("No contacts found for this automation", { status: 404 });
    }



    return new Response(JSON.stringify(contacts), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });

}

function getAutomationDetails(automationID: string) {
    return fetch(`${API_URL}/automations/${automationID}`, {
        headers: {
            "Content-Type": "application/json",
            "Api-Token": API_KEY,
        },
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error fetching automation details: ${response.statusText}`);
            }
            return response.json();
        });
}

async function getContactsForAutomation(automationId: string) {
    let emails: any[] = [];
    let nextOffset = 0;
    let total = 0;
    let limit = 50; // Adjust limit as needed

    do {
        const queryParams = new URLSearchParams({
            offset: nextOffset.toString(),
            limit: limit.toString(),
            seriesid: automationId,
        });


        const data = await fetch(API_URL + '/contacts?' + queryParams, {
            headers: {
                "Content-Type": "application/json",
                "Api-Token": API_KEY,
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error fetching contacts for automation: ${response.statusText}`);
                }
                return response.json();
            });
        emails = emails.concat(data.contacts.map((contact: any) => contact.email));

        total = data.meta.total;
        nextOffset += limit;
        console.log(`[AC] Fetched ${emails.length} contacts.`);

        await new Promise(resolve => setTimeout(resolve, 500)); // Throttle requests to avoid hitting API limits

    } while (nextOffset < total);

    return emails;
}