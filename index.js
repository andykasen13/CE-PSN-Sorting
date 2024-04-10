"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const psn_api_1 = require("psn-api");
async function main() {
    // 1. Authenticate and become authorized with PSN.
    // See the Authenticating Manually docs for how to get your NPSSO.
    const accessCode = await (0, psn_api_1.exchangeNpssoForCode)("ipKIkil3s2Gtq4RfauG28ff3JchGc8B8jEyMInJ6a6pUKExm4COkAbhL8sueEvvO");
    const authorization = await (0, psn_api_1.exchangeCodeForAccessToken)(accessCode);
    // 2. Get the user's `accountId` from the username.
    const allAccountsSearchResults = await (0, psn_api_1.makeUniversalSearch)(authorization, "andykasen13", "SocialAllAccounts");
    console.log(allAccountsSearchResults.domainResponses[0]);
    if (allAccountsSearchResults.domainResponses[0].totalResultCount == 0) {
        throw new Error("Zero results!!");
    }
    const targetAccountId = allAccountsSearchResults.domainResponses[0].results[0].socialMetadata
        .accountId;
    // 3. Get the user's list of titles (games).
    const { trophyTitles } = await (0, psn_api_1.getUserTitles)(authorization, targetAccountId);
    const games = [];
    for (const title of trophyTitles) {
        // 4. Get the list of trophies for each of the user's titles.
        const { trophies: titleTrophies } = await (0, psn_api_1.getTitleTrophies)(authorization, title.npCommunicationId, "all", {
            npServiceName: title.trophyTitlePlatform !== "PS5" ? "trophy" : undefined
        });
        // 5. Get the list of _earned_ trophies for each of the user's titles.
        const { trophies: earnedTrophies } = await (0, psn_api_1.getUserTrophiesEarnedForTitle)(authorization, targetAccountId, title.npCommunicationId, "all", {
            npServiceName: title.trophyTitlePlatform !== "PS5" ? "trophy" : undefined
        });
        // 6. Merge the two trophy lists.
        const mergedTrophies = mergeTrophyLists(titleTrophies, earnedTrophies);
        games.push({
            gameName: title.trophyTitleName,
            platform: title.trophyTitlePlatform,
            trophyTypeCounts: title.definedTrophies,
            earnedCounts: title.earnedTrophies,
            trophyList: mergedTrophies
        });
    }
    // 7. Write to a JSON file.
    fs.writeFileSync("./games.json", JSON.stringify(games));
}
const mergeTrophyLists = (titleTrophies, earnedTrophies) => {
    const mergedTrophies = [];
    for (const earnedTrophy of earnedTrophies) {
        const foundTitleTrophy = titleTrophies.find((t) => t.trophyId === earnedTrophy.trophyId);
        mergedTrophies.push(normalizeTrophy({ ...earnedTrophy, ...foundTitleTrophy }));
    }
    return mergedTrophies;
};
const normalizeTrophy = (trophy) => {
    return {
        isEarned: trophy.earned ?? false,
        earnedOn: trophy.earned ? trophy.earnedDateTime : "unearned",
        type: trophy.trophyType,
        rarity: rarityMap[trophy.trophyRare ?? 0],
        earnedRate: Number(trophy.trophyEarnedRate),
        trophyName: trophy.trophyName,
        groupId: trophy.trophyGroupId
    };
};
const rarityMap = {
    [psn_api_1.TrophyRarity.VeryRare]: "Very Rare",
    [psn_api_1.TrophyRarity.UltraRare]: "Ultra Rare",
    [psn_api_1.TrophyRarity.Rare]: "Rare",
    [psn_api_1.TrophyRarity.Common]: "Common"
};
main();