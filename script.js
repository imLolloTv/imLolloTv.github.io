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

const links = [
    {
        icon: "fa-brands fa-steam",
        link: "https://steamcommunity.com/id/imlollotv/",
        label: "Steam"
    },
    {
        icon: "fa-brands fa-instagram",
        link: "https://www.instagram.com/n.loreee",
        label: "Instagram"
    },
    {
        icon: "fa-brands fa-spotify",
        link: "https://open.spotify.com/user/zsevit1zzx7k35va3b45uiy9t",
        label: "Spotify"
    },
    {
        icon: "fa-brands fa-tiktok",
        link: "https://www.tiktok.com/@n.loreee",
        label: "TikTok"
    },
    {
        icon: "fa-solid fa-chart-simple",
        link: "https://stats.fm/n.loreee",
        label: "Stats.fm"
    },
    {
        icon: "fa-brands fa-twitch",
        link: "https://www.twitch.tv/imLolloTv",
        label: "Twitch"
    },
]

function calculateFlags(flagNumber, flags) {
    flagNumber = BigInt(flagNumber);

    let results = [];

    for (let i = 0; i <= 64; i++) {
        const bitwise = 1n << BigInt(i);

        if (flagNumber & bitwise) {
            const flag = Object.entries(flags).find((f) => f[1].shift === i)?.[0] || `UNKNOWN_FLAG_${i}`;
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

function getTimestamp(currentTimestamp, startTimestamp) {
    let diff = currentTimestamp - startTimestamp;
    
    let secondi = Math.floor(diff / 1000);
    let minuti = Math.floor(secondi / 60);
    let ore = Math.floor(minuti / 60);
    let giorni = Math.floor(ore / 24);

    secondi %= 60;
    minuti %= 60;
    ore %= 24;

    return `${giorni > 0 && (`${giorni}g `) || ""}${ore > 0 && (`${ore}h `) || ""}${minuti || 0}m ${secondi || 0}s`;
}

function getSpotifyTimestamp(currentTimestamp, startTimestamp, endTimestamp) {
    let duration = endTimestamp - startTimestamp;
    let elapsed = currentTimestamp - startTimestamp;

    let durationSecondi = Math.floor(duration / 1000);
    let durationMinuti = Math.floor(durationSecondi / 60);

    let elapsedSecondi = Math.floor(elapsed / 1000);
    let elapsedMinuti = Math.floor(elapsedSecondi / 60);

    durationSecondi %= 60;
    elapsedSecondi %= 60;

    return {
        elapsed: `${String(elapsedMinuti).padStart(2, "0")}:${String(elapsedSecondi).padStart(2, "0")}`, 
        duration: `${String(durationMinuti).padStart(2, "0")}:${String(durationSecondi).padStart(2, "0")}`,
        perc: Math.floor((elapsed / duration) * 100)
    }
}

function userActivity(userActivities, spotifyData) {
    $(".standardActivity")?.remove();

    let currentTimestamp = Date.now();

    if (userActivities && userActivities.length > 0) {
        userActivities = userActivities.filter(a => !a.id.startsWith("spotify:"));

        userActivities.forEach((activity) => {
            let image = getRichPresenceImage(activity?.assets?.large_image || "./assets/img/placeholder.png", {appId: activity.application_id})

            let element = document.createElement("div");
            element.classList.add("richPresenceItem");
            element.classList.add("standardActivity");

            element.innerHTML = `
                <img src="${image}" alt="" class="largeImage">
                <div class="text">
                    <span class="name">${activity.name}</span>
                    ${
                        activity?.details && (
                            `<span class="state">${activity?.details}</span>`
                        ) || ""
                    } 
                    ${
                        activity?.state && (
                            `<span class="state">${activity?.state}</span>`
                        ) || ""
                    } 
                    <span class="time" activity>
                        <i class="fa-regular fa-clock"></i>
                        <span id="${activity?.id}" data-timestampStart="${activity.timestamps?.start}">${getTimestamp(currentTimestamp, activity.timestamps?.start) || "0m 0s"}</span>
                    </span>
                </div>
            `;

            $(".richPresenceContainer").prepend(element);
        });
    };

    let currentSpotifyTitle = $(".spotifyTitle")?.textContent;

    if (spotifyData && spotifyData.song != currentSpotifyTitle) {
        $(".spotifyActivity")?.remove();

        let data = getSpotifyTimestamp(currentTimestamp, spotifyData?.timestamps?.start, spotifyData?.timestamps?.end);
        
        let element = document.createElement("div");
        element.classList.add("richPresenceItem");
        element.classList.add("spotifyActivity");

        element.innerHTML = `
            <img src="${spotifyData.album_art_url}" alt="" class="largeImage">
            <div class="text">
                <span class="name spotifyTitle">${spotifyData.song}</span>
                <span class="details">${spotifyData.artist}</span>
                <div class="status" activitySpotify data-start="${spotifyData?.timestamps?.start}" data-end="${spotifyData?.timestamps?.end}">
                    <span activitySpotifyElapsed>${data.elapsed || "00:00"}</span>
                    <div class="bar">
                        <div activitySpotifyBar style="width: ${data.perc || 0}%"></div>
                    </div>
                    <span activitySpotifyDuration>${data.duration || "00:00"}</span>
                </div>
            </div>
        `;


        $(".richPresenceContainer").append(element);
    } else if (!spotifyData) {
        $(".spotifyActivity")?.remove();
    }
}

window.onload = async function() {
    document.querySelectorAll(".nav").forEach((element) => {
        element.classList.add("disabled");
    });

    const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);

    const __userFlags = await fetch(`https://flags.lewisakura.moe/flags/user.json`);
    const _userFlags = await __userFlags.json();

    // const __applicationFlags = await fetch(`https://flags.lewisakura.moe/flags/application.json`);
    // const _applicationFlags = await __applicationFlags.json();

    if (!response.ok) {
        console.log(response)
    } else {
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

        links.forEach((link) => {
            let element = document.createElement("a");
            element.classList.add("styled")
            element.classList.add("link")
            element.href = link.link;
            element.setAttribute("label", link.label)

            element.innerHTML = `
                <i class="${link.icon}"></i>
            `;

            $(".links").append(element);
        })

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

        userActivity(userActivities, spotifyData);

        $(".loading").style.marginTop = "200px";
        $(".loading").style.opacity = "0";

        $("#apriProfilo").onclick = function() {
            window.open(`https://discord.com/users/${discordId}`);
        };

        document.querySelectorAll(".nav").forEach((element) => {
            element.classList.remove("disabled");
        });

        // $(".alert").style.opacity = "1";
    };

    const repoResponse = await fetch("https://api.github.com/users/imlollotv/repos");

    if (!repoResponse.ok) {
        console.log(repoResponse)
    } else {
        const body = await repoResponse.json();
        
        document.querySelector(".repoContainer").innerHTML = "";
        body.forEach(function(repo) {
            let element = document.createElement("div");
            element.classList.add("repo");
            element.innerHTML = `
                <h3>${repo.name}</h3>
                <p>${repo.description || ""}</p>
            `;
            element.href = repo.html_url;
            element.setAttribute("name", repo.name);
            
            if (repo.archived) {
                element.classList.add("archived");
            };

            $(".repoContainer").append(element);
        });
    };

    setInterval(() => {
        let currentTimestamp = Date.now();
    
        document.querySelectorAll("[activity] span").forEach((element) => {
            let startTimestamp = parseInt(element.getAttribute("data-timestampStart"), 10);
            
            element.textContent = getTimestamp(currentTimestamp, startTimestamp) || "0m 0s";
        });

        let spotifyElement = $("[activitySpotify]");
        if (spotifyElement) {
            let data = getSpotifyTimestamp(currentTimestamp, spotifyElement.getAttribute("data-start"), spotifyElement.getAttribute("data-end"));

            if (data.perc < 100) {
                $("[activitySpotifyElapsed]").innerHTML = data.elapsed || "00:00";
                $("[activitySpotifyBar]").style.width = `${data.perc || 0}%`;
                $("[activitySpotifyDuration]").innerHTML = data.duration || "00:00";
            };
        }
    }, 500);

    setInterval(async () => {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);

        if (!response.ok) {
            console.log(response)
        } else {
            const body = await response.json();
    
            let userActivities = body.data.activities;
            let spotifyData = body.data?.spotify;
    
            userActivity(userActivities, spotifyData);
        };
    }, 5000);

    document.querySelectorAll("a, .repo").forEach((element) => {
        element.onclick = function(event) {
            event.preventDefault();
            window.open(this.href);
        };
    });

    let currentIndex = 0;
    let duringAnim = false;

    document.querySelectorAll(".navRight").forEach((element) => {
        element.onclick = function(event) {
            if (duringAnim) return;

            let parent = element.parentElement;
            
            if (parent.nextSibling) {
                duringAnim = true;
                setTimeout(() => {
                    duringAnim = false;
                }, 2000)

                parent.style.left = `-${100 * (currentIndex + 1)}%`;
                parent.nextElementSibling.style.left = `-${100 * (currentIndex + 1)}%`;

                currentIndex += 1;
            };
        };
    });

    document.querySelectorAll(".navLeft").forEach((element) => {
        element.onclick = function(event) {
            if (duringAnim) return;

            let parent = element.parentElement;
            
            if (parent.previousSibling) {
                duringAnim = true;
                setTimeout(() => {
                    duringAnim = false;
                }, 2000)

                currentIndex -= 1;

                parent.style.left = `-${100 * (currentIndex)}%`;
                parent.previousElementSibling.style.left = `-${100 * (currentIndex)}%`;
            };
        };
    });
}