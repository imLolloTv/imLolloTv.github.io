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

let detectableApps;

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

function getRichPresenceImage(input, options = {}) {
    const { appId = null, ext = "png" } = options;

    if (input && input.startsWith("mp:external/")) {
        const parts = input.replace("mp:external/", "").split("/");
        const httpIndex = parts.findIndex(p => p.startsWith("http") || p.startsWith("https"));
        if (httpIndex !== -1) {
            return parts.slice(httpIndex).join("/").replace(/^https\//, "https://").replace(/^http\//, "http://");
        }
    }

    if (input && /^\d{17,19}$/.test(input) && appId) {
        return `https://cdn.discordapp.com/app-assets/${appId}/${input}.${ext}`;
    }

    if (appId && detectableApps) {
        for (const application of detectableApps) {
            if (application.id == appId) {
                return `https://cdn.discordapp.com/app-icons/${appId}/${application.icon_hash}.${ext}`;
            };
        };
    };

    return "assets/img/placeholder.png";
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
            if (activity?.application_id) {
                let image = getRichPresenceImage(activity?.assets?.large_image, {appId: activity.application_id});

                let element = document.createElement("div");
                element.classList.add("richPresenceItem");
                element.classList.add("standardActivity");

                element.innerHTML = `
                    <img src="${image || ""}" alt="" class="largeImage">
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
            };
        });
    };

    let currentSpotifyTitle = $(".spotifyActivity .name")?.textContent;
    let currentSpotifyStart = $("[activitySpotify]")?.getAttribute("data-start");
    let currentSpotifyEnd = $("[activitySpotify]")?.getAttribute("data-end");

    if (
        spotifyData &&
        (spotifyData.song != currentSpotifyTitle || spotifyData?.timestamps?.start != currentSpotifyStart || spotifyData?.timestamps?.end != currentSpotifyEnd)
    ) {
        $(".spotifyActivity")?.remove();

        let data = getSpotifyTimestamp(currentTimestamp, spotifyData?.timestamps?.start, spotifyData?.timestamps?.end);
        
        let element = document.createElement("div");
        element.classList.add("richPresenceItem");
        element.classList.add("spotifyActivity");

        element.innerHTML = `
            <div class="vinyl">
                <img src="${spotifyData.album_art_url}" alt="" class="largeImage">
            </div>
            <div class="text">
                <span class="name">${spotifyData.song}</span>
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
    if (typeof ClickSpark !== "undefined") {
        new ClickSpark(document.body, {
            sparkColor: '#fff',
            sparkSize: 10,
            sparkRadius: 20,
            sparkCount: 10,
            duration: 300,
            easing: 'ease-out', // linear, ease-in, ease-in-out
            extraScale: 1.0
        });
    };

    if (typeof LiquidEther !== "undefined") {
        // document.body.style.background = "#100000";
        document.body.style.background = "#060010";

        function getLiquidSettings() {
            const width = window.innerWidth;
            const cores = navigator.hardwareConcurrency || 4;

            if (width <= 480) {
                return {
                    resolution: 0.25,
                    iterationsPoisson: 10,
                    iterationsViscous: 10
                };
            }

            if (width <= 768 || cores <= 4) {
                return {
                    resolution: 0.35,
                    iterationsPoisson: 16,
                    iterationsViscous: 16
                };
            }

            return {
                resolution: 0.4,
                iterationsPoisson: 32,
                iterationsViscous: 32
            };
        }

        const ether = new LiquidEther(document.getElementById("liquidEther"), {
            mouseForce: 20,
            cursorSize: 100,
            isViscous: true,
            viscous: 30,
            dt: 0.014,
            BFECC: true,
            isBounce: true,
            // colors: ["#ff2929","#ff615c","#f19993"],
            colors: ["#8929ff","#be5cff","#e193f1"],
            autoDemo: true,
            autoSpeed: 0.5,
            autoIntensity: 2.2,
            takeoverDuration: 0.25,
            autoResumeDelay: 1000,
            autoRampDuration: 0.6,

            ...getLiquidSettings()
        });

        window.addEventListener("resize", () => {
            ether.updateOptions(getLiquidSettings());
        });
    };

    if (typeof VanillaTilt !== "undefined") {
        VanillaTilt.init(document.querySelectorAll("section > main"), {
            reverse:                true,
            max:                    10,
            scale:                  1.05,
            speed:                  1000,
            gyroscope:              true,
            gyroscopeMinAngleX:     -45,
            gyroscopeMaxAngleX:     45,
            gyroscopeMinAngleY:     -45,
            gyroscopeMaxAngleY:     45,
        });
    }

    document.querySelectorAll(".nav").forEach((element) => {
        element.classList.add("disabled");
    });

    const __userFlags = await fetch(`https://flags.lewisakura.moe/flags/user.json`);
    const _userFlags = await __userFlags.json();

    const _detectableApps = await fetch("https://discord.com/api/v9/applications/detectable");
    detectableApps = await _detectableApps.json();

    const socket = new WebSocket("wss://api.lanyard.rest/socket");
    socket.onopen = () => {
        socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
    };

    socket.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);

        if (msg.op === 1) {
            heartbeatInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ op: 3 }));
            }, msg.d.heartbeat_interval);
        }

        if (msg.op === 0) {
            const body = msg.d;
            if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') {
                // console.log(body)

                let userData = body.discord_user;
                let userActivities = body.activities;
                let spotifyData = body?.spotify;

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

                $(".flagContainer").innerHTML = "";
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
            }
        }
    });

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
    });

    const packagesResponse = await fetch("https://headless.tebex.io/api/accounts/ppxl-1feb21eff335afb074d73e9c154f57ecaa341d84/packages");

    if (!packagesResponse.ok) {
        console.log(packagesResponse)
    } else {
        const body = await packagesResponse.json();
        
        document.querySelector(".packagesContainer").innerHTML = "";
        body.data.forEach(function(package) {
            let element = document.createElement("div");
            element.classList.add("package");
            element.innerHTML = `
                <img src="${package.image}">
                <h3>${package.name}</h3>
                <p>${package.currency} ${Number(package.total_price).toFixed(2)}</p>
            `;
            element.href = `https://imlollotv.tebex.io/package/${package.id}`;

            // if (package.discount) {
            //     element.classList.add("scontato");
            // };

            $(".packagesContainer").append(element);
        });
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

    document.querySelectorAll("a, .repo, .package").forEach((element) => {
        element.onclick = function(event) {
            event.preventDefault();
            window.open(this.href);
        };
    });

    let currentIndex = 0;
    currentSection = "main";
    let duringAnim = false;

    let animTimeout = 0; // Old: 2000 

    document.querySelectorAll(".navRight").forEach((element) => {
        element.onclick = function(event) {
            if (duringAnim) return;

            let parent = element.parentElement;
            
            if (parent.nextSibling) {
                duringAnim = true;
                setTimeout(() => {
                    duringAnim = false;
                }, animTimeout)

                parent.style.left = `-${100 * (currentIndex + 1)}%`;
                parent.nextElementSibling.style.left = `-${100 * (currentIndex + 1)}%`;

                currentIndex += 1;
                currentSection = parent.nextElementSibling.className;
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
                }, animTimeout)

                currentIndex -= 1;
                currentSection = parent.previousElementSibling.className;

                parent.style.left = `-${100 * (currentIndex)}%`;
                parent.previousElementSibling.style.left = `-${100 * (currentIndex)}%`;
            };
        };
    });

    document.addEventListener("wheel", (event) => {
        document.querySelector(`.${currentSection} .${event.deltaY > 0 ? "navRight" : "navLeft"}`)?.onclick();
    })

    document.addEventListener('touchstart', handleTouchStart, false);        
    document.addEventListener('touchmove', handleTouchMove, false);

    document.querySelector("video")?.addEventListener("pause", (event) => {
        event.target.play();
    });
}

// https://stackoverflow.com/questions/2264072/detect-a-finger-swipe-through-javascript-on-the-iphone-and-android

var xDown = null;
var yDown = null;

function getTouches(evt) {
    return evt.touches || /* browser API */ evt.originalEvent.touches; /* jQuery */
}

function handleTouchStart(evt) {
    const firstTouch = getTouches(evt)[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
};

function handleTouchMove(evt) {
    if ( ! xDown || ! yDown ) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) { /*most significant*/
        if ( xDiff > 0 ) {
            /* right swipe */ 
            document.querySelector(`.${currentSection} .navRight`)?.onclick();
        } else {
            /* left swipe */
            document.querySelector(`.${currentSection} .navLeft`)?.onclick();
        }
    } else {
        if ( yDiff > 0 ) {
            /* down swipe */ 
        } else { 
            /* up swipe */
        }
    }
    /* reset values */
    xDown = null;
    yDown = null;
};