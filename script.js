const $ = (sel, root = document) => root.querySelector(sel);

let userId = "623496189056253953";
const validFlags = [
    {
        id: "HYPESQUAD_ONLINE_HOUSE_1",
        img: "https://raw.githubusercontent.com/mezotv/discord-badges/refs/heads/main/assets/hypesquadbravery.svg",
        label: "Hypesquad Bravery"
    },
    {
        id: "HYPESQUAD_ONLINE_HOUSE_2",
        img: "https://raw.githubusercontent.com/mezotv/discord-badges/refs/heads/main/assets/hypesquadbrilliance.svg",
        label: "Hypesquad Brilliance"
    },
    {
        id: "HYPESQUAD_ONLINE_HOUSE_3",
        img: "https://raw.githubusercontent.com/mezotv/discord-badges/refs/heads/main/assets/hypesquadbalance.svg",
        label: "Hypesquad Balance"
    },
    {
        id: "ACTIVE_DEVELOPER",
        img: "https://raw.githubusercontent.com/mezotv/discord-badges/refs/heads/main/assets/activedeveloper.svg",
        label: "Sviluppatore attivo"
    },
]

function calculateFlags(flagNumber, flags) {
    flagNumber = BigInt(flagNumber);

    let results = [];

    for (let i = 0; i <= 64; i++) {
        const bitwise = 1n << BigInt(i);

        if (flagNumber & bitwise) {
            const flag = Object.entries(flags).find((f) => f[1].shift === i)?.[0] || `UNKNOWN_FLAG_${i}`;
            // results.push(flag);
            results[flag] = true;
        }
    }

    return results;
}

// ChatGPT 💘
function getRichPresenceImage(input, options = {}) {
    const { appId = null, ext = "png" } = options;

    if (input.startsWith("mp:external/")) {
        const parts = input.replace("mp:external/", "").split("/");
        const httpIndex = parts.findIndex(p => p.startsWith("http") || p.startsWith("https"));
        if (httpIndex !== -1) {
            return parts.slice(httpIndex).join("/").replace(/^https\//, "https://").replace(/^http\//, "http://");
        }
    }

    if (/^\d{17,19}$/.test(input) && appId) {
        return `https://cdn.discordapp.com/app-assets/${appId}/${input}.${ext}`;
    }

    return input;
}

window.onload = async function() {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);

    const __userFlags = await fetch(`https://flags.lewisakura.moe/flags/user.json`);
    const _userFlags = await __userFlags.json();
    // const _applicationFlags = (await fetch(`https://flags.lewisakura.moe/flags/application.json`)).json();

    if (!response.ok) {
        console.log(response)
    } else {
        // const body = JSON.parse(await response.text());
        const body = await response.json();

        let userData = body.data.discord_user;
        let userActivities = body.data.activities;
        let spotifyData = body.data?.spotify;

        let discordId = userData.id;

        let immagine, avatarDecoration;

        if (userData.avatar && userData.avatar.startsWith("a_")) {
            immagine = `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.gif`;
        } else if (userData.avatar) {
            immagine = `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`;
        } else {
            if (userData.discriminator === 0 || userData.discriminator === "0") {
                immagine = `https://cdn.discordapp.com/embed/avatars/${((discordId >> 22) % 6)}.png`;
            } else {
                immagine = `https://cdn.discordapp.com/embed/avatars/${(userData.discriminator % 5)}.png`;
            }
        };

        if (userData?.avatar_decoration_data?.asset) {
            avatarDecoration = `https://cdn.discordapp.com/avatar-decoration-presets/${userData?.avatar_decoration_data?.asset}.png`
        }

        $(".logo").src = immagine;
        $(".avatarDecoration").src = avatarDecoration || "";

        $("h1").innerHTML = userData.global_name;
        $("h4").innerHTML = userData.username;

        document.title = `${userData.global_name} (@${userData.username})`

        $("main").style.marginTop = "unset";
        $("main").style.opacity = "1";

        let userFlags = calculateFlags(userData.public_flags, _userFlags);
        // let applicationFlags = calculateFlags(userData.public_flags, _applicationFlags);

        validFlags.forEach((flagData) => {
            if (userFlags[flagData.id]) {
                let element = document.createElement("span");
                element.style.backgroundImage = `url(${flagData.img})`;
                element.style.backgroundRepeat = "no-repeat";
                element.style.backgroundSize = "cover";
                element.setAttribute("label", flagData.label);

                $(".flagContainer").append(element);
            }
        })

        if (userActivities && userActivities.length > 0) {
            userActivities = userActivities.filter(a => !a.id.startsWith("spotify:"));

            userActivities.forEach((activity) => {
                let image = getRichPresenceImage(activity?.assets?.large_image || activity?.assets?.large_image, {appId: activity.application_id})

                // WIP
                let element = document.createElement("div");
                element.classList.add("richPresenceItem");
                element.innerHTML = `
                    <img src="${image}" alt="" class="largeImage">
                    <div class="text">
                        <span class="name">${activity.name}</span>
                        <span class="details">${activity.details}</span>
                        <span class="state">${activity?.state}</span>
                        <span class="time">${activity.timestamps?.start}</span>
                    </div>
                `;

                $(".richPresenceContainer").append(element);
            });
        };

        // WIP
        if (spotifyData) {
            let element = document.createElement("div");
            element.classList.add("richPresenceItem");
            element.innerHTML = `
                <img src="${spotifyData.album_art_url}" alt="" class="largeImage">
                <div class="text">
                    <span class="name spotifyTitle">${spotifyData.song}</span>
                    <span class="details">${spotifyData.artist}</span>
                    <div class="status">
                        
                    </div>
                </div>
            `;

            $(".richPresenceContainer").append(element);
        }

        $(".loading").style.marginTop = "200px";
        $(".loading").style.opacity = "0";

        $("#apriProfilo").onclick = function() {
            window.open(`https://discord.com/users/${discordId}`);
        };

        $(".alert").style.opacity = "1";
    };

    $(".githubLink").onclick = function() {
        window.open("https://github.com/imLolloTv/imLolloTv.github.io");
    };
}