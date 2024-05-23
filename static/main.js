const isMob = window.innerWidth < 900;
let dropdown = null;
let loaderWrapper = null;
let targetUnit = null;
let selectedUnit = null;
let localStorageSelectedUnit = null;
let electionResults = null;
const trustDomains = [
    'https://dw.vecernji.hr',
    'https://www.vecernji.hr',
    'https://synth.24sata.rocks',
    'https://www.24sata.hr',
    'http://127.0.0.1:8000'
];

function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';

    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }

    return color;
}

function setLiveOrNot(live) {
    const liveElement = document.querySelector('.live');
    if (liveElement && !live) liveElement.style.visibility = 'hidden';
}

function fixTooltipPosition() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) document.documentElement.style.setProperty('--textShadow', '0 0 1.3px #090909');

    const allTooltips = document.querySelectorAll('.tooltip_wrapper .tooltip');

    allTooltips?.forEach(e => {
        if (isSafari) e.classList.add('after_safari');

        if (!isMob) {
            const tooltipPosition = e.getBoundingClientRect();

            if (tooltipPosition && ((tooltipPosition.x + tooltipPosition.width) > window.innerWidth)) {
                const parent = e.parentNode;
                if (parent) {
                    parent.style.left = 'unset';
                    parent.style.right = '90%';
                    parent.style.setProperty('--tooltipPadding', '10px 20px 10px 5px');
                }
                e.classList.add('hide_after','display_before');

                if (isSafari) e.classList.add('hide_after','display_before_safari');
            }
        }
    });
}

function percentToPixel(percent) {
    let min = 39, max = 143;

    return ((percent / 100) * (max - min)) + min;
}

function placeDataInHtml(responseData, rh = true) {
    document.getElementById('election_results').replaceChildren();

    let tooltipHeader = 'Lista stranaka unutar koalicije:';
    const dataToProcess = rh ? responseData.ukupnoMandatiGrupirano : responseData;
    let maxMandates = 151;
    const allMandates = [];

    dataToProcess?.forEach(m => {
        allMandates.push(m.brMandata);
    });

    maxMandates = Math.max(...allMandates);

    const fragment = new DocumentFragment();

    dataToProcess?.forEach(e => {
        const isOstali = e.naziv.toLowerCase().includes('ostal');
        if (isOstali) tooltipHeader = 'Ostale stranke s mandatima';

        const wrapperDiv = document.createElement('div');
        wrapperDiv.setAttribute('class', 'party_result_wrapper');

        const party = document.createElement('p');
        party.textContent = e.naziv;
        party.setAttribute('class', 'party');
        wrapperDiv.appendChild(party);

        const mandateElement = document.createElement('p');
        mandateElement.textContent = e.brMandata;

        // graph start
        const graphicalRepresentation = document.createElement('div');
        const percent = (e.brMandata/maxMandates)*100;
        const howManyPixels = percentToPixel(percent);

        setTimeout(() => {
            if (isMob) {
                graphicalRepresentation.style.width = `${percent}%`;
            } else {
                graphicalRepresentation.style.height = `${percent}%`;
                mandateElement.style.bottom = `${howManyPixels}px`;
            }
        }, 150);

        const graphColor = e.color ? e.color : getRandomColor();
        graphicalRepresentation.style.backgroundColor = graphColor;

        if (e.hover) {
            graphicalRepresentation.style.setProperty('--graphHover', e.hover);
            graphicalRepresentation.style.filter = 'unset';
        } else graphicalRepresentation.style.setProperty('--graphHover', graphColor);

        graphicalRepresentation.setAttribute('class', 'graph');

        const graphWrapper = document.createElement('div');
        graphWrapper.setAttribute('class', 'graph_wrapper');
        graphWrapper.appendChild(graphicalRepresentation);
        if (isMob) graphWrapper.appendChild(mandateElement);

        wrapperDiv.appendChild(graphWrapper);
        if (!isMob) wrapperDiv.appendChild(mandateElement);
        // graph end

        // tooltip start
        const divTooltipWrapper = document.createElement('div');
        divTooltipWrapper.setAttribute('class', 'tooltip_wrapper scrollable_wrapper');
        const divTag = document.createElement('div');
        divTag.setAttribute('class', 'tooltip');
        const tooltipP = document.createElement('p');
        tooltipP.textContent = tooltipHeader;
        divTag.appendChild(tooltipP);
        divTooltipWrapper.appendChild(divTag);

        const tooltipOlElement = document.createElement('ul');
        let dataForProcess = e.political_parties;

        if (!rh) dataForProcess = e.stranke;

        dataForProcess?.forEach(s => {
            const liTag = document.createElement('li');
            liTag.innerHTML = s.naziv || s;
            tooltipOlElement.appendChild(liTag);
        });

        divTag.appendChild(tooltipOlElement);
        wrapperDiv.appendChild(divTooltipWrapper);
        // tooltip end

        fragment.appendChild(wrapperDiv);
    });

    const resultsElement = document.getElementById('election_results');
    resultsElement.appendChild(fragment);

    fixTooltipPosition();

    if (loaderWrapper) loaderWrapper.style.display = 'none';
}

function setUnitData(unit) {
    electionResults.izborne_jedinice?.forEach(res => {
        if (res.ijSifra.includes(unit)) placeDataInHtml(res.lista, false);
    });
}

function setProcessedVotesAndLastChange(status, refresh = true) {
    const destination = document.getElementById('processed_votes_and_last_change');

    if (!destination) return;

    if (refresh) destination.replaceChildren();

    const tempInfo = document.getElementById('processed_votes_and_last_change_template');
    const cloneInfo = tempInfo.content.cloneNode(true);
    const processedVotes = cloneInfo.getElementById('processed_votes');

    processedVotes.textContent = (`${status?.bmPosto}%`) + processedVotes.textContent;

    const lastChange = cloneInfo.getElementById('last_change');
    const lastUpdated = (status?.vrijeme)?.split(":");
    const paddedTime = lastUpdated?.map(i => i.padStart(2, '0'));
    lastChange.textContent += `${paddedTime?.join(':')} H`;

    destination.appendChild(cloneInfo);
}

function processData(responseData, click = false) {
    if (!click) setProcessedVotesAndLastChange(responseData.status, false);

    placeDataInHtml(responseData);
}

function decideHowToProcess(unit) {
    if (unit === '0') processData(electionResults, true);
    else setUnitData(unit);
}

function setSelectedUnitInMenu(value) {
    if (targetUnit) {
        targetUnit.textContent = value;

        trustDomains.forEach(domain => {
            window.parent.postMessage(value, domain);
        });
    }
}
 
window.addEventListener('pointerup', (e) => {
    const svg = document.querySelector('svg');

    if (dropdown && e.composedPath().includes(dropdown)) {
        if (dropdown.classList.contains('closed')) {
            dropdown.classList.remove('closed');
            svg?.classList.add('open');
        } else {
            dropdown.classList.add('closed');
            svg?.classList.remove('open');
            const target = e.target;
            const unit = target ? target.dataset.unit : null;

            if (!unit) return;

            if (loaderWrapper) loaderWrapper.style.display = 'block';

            if (target) {
                setSelectedUnitInMenu(target.textContent);

                target.parentNode.querySelectorAll('li').forEach(li => {
                    li.classList.remove('selected');
                });
                target.classList.add('selected');
            }

            decideHowToProcess(unit);
        }
    } else {
        dropdown.classList.add('closed');
        svg?.classList.remove('open');
    }
});

function autoRefresh() {
    if (loaderWrapper) loaderWrapper.style.display = 'block';

    getElectionsData(true);
}

function handleRefresh() {
    setProcessedVotesAndLastChange(electionResults.status);
    setLiveOrNot(electionResults.live);

    const menuItems = document.querySelectorAll('.menu_items li');

    menuItems.forEach(item => {
        if (item.textContent === targetUnit.textContent) decideHowToProcess(item.dataset.unit);
    });
}

async function getElectionsData(refresh = false) {
    url = 'https://showcase.24sata.hr/izbori2024/parliamentary-elections-2024-apis-strong.json';

    fetch(url).then((response) => {
        if (response.ok) {
            return response.json();
        }
    })
    .then((responseJson) => {
        electionResults = responseJson;

        if (refresh) {
            handleRefresh();

            return;
        }

        dropdown = document.querySelector('.dropdown');
        loaderWrapper = document.querySelector('.loader_wrapper');
        targetUnit = document.querySelector('#target_unit');
        selectedUnit = localStorageSelectedUnit || targetUnit.textContent;

        setLiveOrNot(electionResults.live);
        processData(electionResults);

        if (electionResults.live) {
            const interval = electionResults.interval || 60000;
            setInterval(autoRefresh, interval);
        }
    })
    .catch((error) => {
        console.error(`[Elections widget] Election results data were not retrieved due to: \n${error}`);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // INFO: Can be 'examples/parliamentary-elections-2024.json' but run on some kind http server 
    getElectionsData();
});

window.addEventListener('message', event => {
    if (trustDomains.indexOf(event.origin) >= 0) {
        const eventData = event.data;
        selectedUnit = eventData;
        if (targetUnit) targetUnit.textContent = eventData;
        localStorageSelectedUnit = eventData;

        if (loaderWrapper) loaderWrapper.style.display = 'block';

        setSelectedUnitInMenu(eventData);
        if (!electionResults) getElectionsData(true);
        else handleRefresh();
    }
});

function debounce (fn, delay) {
    let timer = null;

    return function () {
        const context = this;
        const args = arguments;

        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(context, args);
        }, delay);
    };
}

window.addEventListener('resize', debounce(() => {
    if ((window.innerWidth < 900) !== isMob) {
        window.location.reload();
    }
}, 200));
