const dropdown = document.querySelector('.dropdown');
const loaderWrapper = document.querySelector('.loader_wrapper');
const isMob = window.innerWidth < 900;
let electionResults = {};

function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';

    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }

    return color;
}

function setLiveOrNot(live) {
    if (!live) document.querySelector('.live').style.visibility = 'hidden';
}

function fixTooltipPosition() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const allTooltips = document.querySelectorAll('.tooltip_wrapper .tooltip');

    allTooltips.forEach(e => {
        if (isSafari) e.classList.add('after_safari');

        if (!isMob) {
            const tooltipPosition = e.getBoundingClientRect();

            if ((tooltipPosition.x + tooltipPosition.width) > window.innerWidth) {
                e.parentNode.style.left = 'unset';
                e.parentNode.style.right = '90%';
                e.classList.add('hide_after','display_before');
                e.parentNode.style.setProperty('--tooltipPadding', '10px 20px 10px 5px');

                if (isSafari) e.classList.add('hide_after','display_before_safari');
            }
        }
    });
}

function placeDataInHtml(responseData, rh = true, manjine = false) {
    document.getElementById('election_results').replaceChildren();
    const tooltipHeader = 'Lista stranaka unutar koalicije:';
    const dataToProcess = rh ? responseData.ukupnoMandati : responseData;
    let maxMandates = 151;

    const fragment = new DocumentFragment();

    dataToProcess.forEach((e, i) => {
        if (i === 0) maxMandates = e.brMandata;

        const wrapperDiv = document.createElement('div');
        wrapperDiv.setAttribute('class', 'party_result_wrapper');

        const party = document.createElement('p');
        let partyName = manjine ? '' : e.naziv;
        if (manjine) {
            e.lista.forEach((p, i) => {
                if ((i + 1) === e.lista.length) partyName += p.naziv;
                else partyName += `${p.naziv}, `;
            });
        }
        party.textContent = partyName;
        party.setAttribute('class', 'party');
        wrapperDiv.appendChild(party);

        // graph start
        const graphicalRepresentation = document.createElement('div');
        setTimeout(() => {
            if (isMob) {
                graphicalRepresentation.style.width = `${(e.brMandata/maxMandates)*100}%`;
            } else {
                graphicalRepresentation.style.height = `${(e.brMandata/maxMandates)*100}%`;
            }
        }, 150);
        // ToDo: boja stranke!!
        graphicalRepresentation.style.backgroundColor = e.color ? e.color : getRandomColor();
        graphicalRepresentation.setAttribute('class', 'graph');

        const graphWrapper = document.createElement('div');
        graphWrapper.setAttribute('class', 'graph_wrapper');
        graphWrapper.appendChild(graphicalRepresentation);

        const mandateElement = document.createElement('p');
        mandateElement.textContent = e.brMandata;
        graphWrapper.appendChild(mandateElement);

        wrapperDiv.appendChild(graphWrapper);
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
        const tooltipOlElement = document.createElement('ol');
        const dataFoProcess = manjine ? e.lista[0].stranke : e.stranke;
        dataFoProcess.forEach(s => {
            const liTag = document.createElement('li');
            liTag.textContent = s.naziv;
            tooltipOlElement.appendChild(liTag);
        });
        divTag.appendChild(tooltipOlElement);
        wrapperDiv.appendChild(divTooltipWrapper);
        // tooltip end

        fragment.appendChild(wrapperDiv);
    });

    const resultsElement = document.getElementById('election_results');
    resultsElement.appendChild(fragment);

    loaderWrapper.style.display = 'none';

    fixTooltipPosition();
}

function setUnitData(unit) {
    if (unit === '012') placeDataInHtml(electionResults.izborne_liste_manjine, false, true);

    else electionResults.izborne_jedinice.forEach(res => {
        if (res.ijSifra.includes(unit)) placeDataInHtml(res.lista, false);
    });
}

function processData(responseData, click = false) {
    if (!click) {
        const tempInfo = document.getElementById('processed_votes_and_last_change_template');
        const cloneInfo = tempInfo.content.cloneNode(true);
        const processedVotes = cloneInfo.getElementById('processed_votes');
        // ToDo: postotak obrađenih glasova!!
        processedVotes.textContent = (responseData.processed_votes || '0%') + processedVotes.textContent;

        const lastChange = cloneInfo.getElementById('last_change');
        const date = new Date(responseData.time_updated);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const newTime = new Date(date.getTime() - userTimezoneOffset);
        const timeStrings = (newTime.toLocaleTimeString()).split(':');
        const paddedTime = timeStrings.map(i => i.padStart(2, '0'));
        // ToDo: provjeriti da li prikazuje dobro vrijeme!!
        lastChange.textContent += `${paddedTime.join(':').substring(0,5)} H`;

        const destination = document.getElementById('processed_votes_and_last_change');
        destination.appendChild(cloneInfo);
    }

    placeDataInHtml(responseData);
}
 
window.addEventListener('pointerup', (e) => {
    const svg = document.querySelector('svg');

    if (e.composedPath().includes(dropdown)) {
        if (dropdown.classList.contains('closed')) {
            dropdown.classList.remove('closed');
            svg.classList.add('open');
        } else {
            dropdown.classList.add('closed');
            svg.classList.remove('open');
            const unit = e.target.dataset.unit;

            if (!unit) return;

            loaderWrapper.style.display = 'block';
            document.querySelector('#target_unit').textContent = e.target.textContent;

            if (unit === '0') processData(electionResults, true);
            else setUnitData(unit);
        }
    } else {
        dropdown.classList.add('closed');
        svg.classList.remove('open');
    }
});

async function getElectionsData(url = 'https://showcase.24sata.hr/izbori2024/parliamentary-elections-2024.json') {
    fetch(url).then((response) => {
        if (response.ok) {
            return response.json();
        }
    })
    .then((responseJson) => {
        electionResults = responseJson;

        setLiveOrNot(responseJson.live);
        processData(responseJson);
    })
    .catch((error) => {
        console.log(`Election results data were not retrieved due to: \n${error}`);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // INFO: Can be 'examples/parliamentary-elections-2024.json' but run on some kind http server 
    getElectionsData();
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
