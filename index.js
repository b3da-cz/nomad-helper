class NomadHelper {
  constructor() {
    this.startDate = new Date()
    this.homeAirport = 'PRG'
    this.currency = 'CZK'
    this.adults = 1
    this.minNightsInCity = 1
    this.maxNightsInCity = 7
    this.visitedCitiesMax = 1
    this.maxFlightDurationH = 6
    this.limitResultsPerRound = 3
    this.routes = []
    this.requestsSent = 0
    this.requestsResponded = 0
    this.requestsErrors = 0

    this.inputStartDateEl = document.getElementById('startDate')
    this.inputHomeAirportEl = document.getElementById('homeAirport')
    this.inputCurrencyEl = document.getElementById('currency')
    this.inputAdultsEl = document.getElementById('adults')
    this.inputMinNightsInCityEl = document.getElementById('minNightsInCity')
    this.inputMaxNightsInCityEl = document.getElementById('maxNightsInCity')
    this.inputVisitedCitiesMaxEl = document.getElementById('visitedCitiesMax')
    this.inputLimitResultsPerRoundEl = document.getElementById('limitResultsPerRound')
    this.btnScanEl = document.getElementById('btnScan')
    this.resultEl = document.getElementById('result')
    this.searchResultInputEl = document.getElementById('searchResultInput')
    this.progressEl = document.getElementById('progress')
    this.storageSaveEl = document.getElementById('storageSave')
    this.storageLoadEl = document.getElementById('storageLoad')

    this.inputStartDateEl.value = this.startDate.toISOString().substr(0, 10)
    this.searchResultInputEl.hidden = true
    this.searchResultInputEl.addEventListener('keyup', () => this.search())
    this.inputLimitResultsPerRoundEl.addEventListener('change', () => {
      const diff = (this.inputLimitResultsPerRoundEl.value * this.inputVisitedCitiesMaxEl.value)
      this.progressEl.innerText = diff > 23 ? 'go for coffee :)' : diff > 15 ? 'this will take long time to process!' : diff > 10 ? 'this can take little longer..' : ''
      this.progressEl.style.color = diff > 10 ? '#ac0e00' : '#333'
    })
    this.storageSaveEl.addEventListener('click', () => {
      const label = prompt('Save as:', `${this.homeAirport} - ${this.fmtDate(this.startDate)} (dest: ${this.visitedCitiesMax}, depth: ${this.limitResultsPerRound})`)
      if (label && label.length > 0) {
        this.storageSave(label)
      }
    })
    this.storageLoadLabels()
    this.storageLoadEl.addEventListener('change', () => {
      const label = this.storageLoadEl.options[this.storageLoadEl.selectedIndex].value
      if (label && label.length > 0) {
        this.storageLoad(label);
      }
    })
    this.btnScanEl.addEventListener('click', () => {
      this.startDate = new Date(this.inputStartDateEl.value)
      this.homeAirport = this.inputHomeAirportEl.value
      this.currency = this.inputCurrencyEl.value
      this.adults = Number(this.inputAdultsEl.value)
      this.minNightsInCity = Number(this.inputMinNightsInCityEl.value)
      this.maxNightsInCity = Number(this.inputMaxNightsInCityEl.value)
      this.visitedCitiesMax = Number(this.inputVisitedCitiesMaxEl.value)
      this.limitResultsPerRound = Number(this.inputLimitResultsPerRoundEl.value)
      this.routes = []
      this.btnScanEl.disabled = true
      this.scan({
        partner: 'picky',
        curr: this.currency,
        date_from: this.fmtDate(this.startDate),
        date_to: this.fmtDate(this.getDatePlusDays(this.startDate, this.maxNightsInCity)),
        fly_from: this.homeAirport,
        fly_to: null,
        adults: this.adults,
        max_fly_duration: this.maxFlightDurationH,
        direct_flights: 1,
        limit: this.limitResultsPerRound,
        sort: 'price',
        asc: 1,
      })
    })
  }

  scan(options = {
    partner: 'picky', // mandatory
    curr: this.currency,
    fly_from: this.homeAirport,
    date_from: '01/12/2018',
    date_to: '02/12/2018',
    adults: 1,
    max_fly_duration: 4,
    direct_flights: 1,
    flight_type: 'oneway',
    // nights_in_dst_from: 2,
    // nights_in_dst_to: 5,
    // return_from: '02/12/2018',
    // return_to: '20/12/2018',
    nights_in_dst_from: null,
    nights_in_dst_to: null,
    return_from: null,
    return_to: null,
    limit: 5,
    sort: 'price',
    asc: 1,
  }, route = null) {
    const getParamsFromOptions = () => Object.keys(options)
      .filter(key => options[key] !== undefined && options[key] !== null)
      .map(key => `${key}=${options[key]}`)
      .join('&')
    const apiUrl = `https://api.skypicker.com/flights?${getParamsFromOptions()}`
    this.requestsSent++
    this.updateProgress()
    fetch(apiUrl)
      .then(res => res.json())
      .catch(e => {
        console.error(e)
        this.requestsResponded++
        this.requestsErrors++
        this.updateProgress()
      })
      .then(resJson => {
        this.requestsResponded++
        this.updateProgress()
        if (resJson.data && resJson.data.length > 0) {
          if (!route) {
            route = []
          }
          resJson.data.forEach(d => {
            if (!this.isAirportVisited(route, d.flyTo)) {
              const r = {}
              r.fromAirport = d.flyFrom
              r.fromCity = d.cityFrom
              r.fromDate = options.date_from
              r.departureTime = d.dTimeUTC
              r.toAirport = d.flyTo
              r.toCity = d.cityTo
              r.toDate = options.date_to
              r.arrivalTime = d.aTimeUTC
              r.flightDuration = d.fly_duration
              r.price = d.price
              r.flightsPerRoute = d.pnr_count
              r.deepLink = d.deep_link
              r.airlines = d.airlines
              if (route.length < this.visitedCitiesMax) {
                this.scan({
                  partner: 'picky',
                  curr: this.currency,
                  date_from: this.fmtDate(this.getDatePlusDays(new Date(r.departureTime * 1000), this.minNightsInCity)),
                  date_to: this.fmtDate(this.getDatePlusDays(new Date(r.departureTime * 1000), this.maxNightsInCity)),
                  fly_from: r.toAirport,
                  fly_to: null,
                  adults: this.adults,
                  max_fly_duration: this.maxFlightDurationH,
                  direct_flights: 1,
                  limit: this.limitResultsPerRound,
                  sort: 'price',
                  asc: 1,
                }, [...route, r])
              }
              if (route.length === this.visitedCitiesMax) {
                this.scan({
                  partner: 'picky',
                  curr: this.currency,
                  date_from: this.fmtDate(this.getDatePlusDays(new Date(r.departureTime * 1000), this.minNightsInCity)),
                  date_to: this.fmtDate(this.getDatePlusDays(new Date(r.departureTime * 1000), this.maxNightsInCity)),
                  fly_from: r.toAirport,
                  fly_to: this.homeAirport,
                  adults: this.adults,
                  max_fly_duration: this.maxFlightDurationH,
                  // direct_flights: 0,
                  limit: this.limitResultsPerRound,
                  sort: 'price',
                  asc: 1,
                }, [...route, r])
              }
              if (route.length === this.visitedCitiesMax + 1) {
                const result = [...route, r]
                this.routes.push(result)
                if ((this.visitedCitiesMax * this.limitResultsPerRound) < 6) {
                  this.sortRoutes()
                }
                if ((this.visitedCitiesMax * this.limitResultsPerRound) < 8 || this.requestsResponded % Math.floor(this.routes.length / 5) === 0) {
                  this.renderResult(this.routes)
                }
                if (this.requestsSent === this.requestsResponded) {
                  this.updateProgress(true)
                }
              }
            }
          })
        }
      })
      .catch(e => {
        console.error(e)
        this.requestsResponded++
        this.requestsErrors++
        this.updateProgress()
      })
  }

  search() {
    const searchPhrase = this.searchResultInputEl.value
    const results = this.routes
      .filter(route => route.filter(
        r => r.fromCity.toLowerCase().includes(searchPhrase)
          || r.fromAirport.toLowerCase().includes(searchPhrase)
          || r.toCity.toLowerCase().includes(searchPhrase)
          || r.toAirport.toLowerCase().includes(searchPhrase)
      ).length > 0)
    this.renderResult(results)
  }

  updateProgress(isDone = false) {
    if (isDone || (this.requestsSent > 0 && this.requestsSent === this.requestsResponded)) {
      this.btnScanEl.innerText = 'scan'
      this.btnScanEl.disabled = false
      if (this.routes && this.routes.length > 0) {
        this.sortRoutes()
        this.searchResultInputEl.hidden = false
      }
      this.requestsSent = 0
      this.requestsResponded = 0
    } else if (this.requestsSent > 0 && this.requestsSent - 1 === this.requestsResponded) {
      this.btnScanEl.innerText = `processing`
      this.btnScanEl.disabled = true
    } else if (this.requestsErrors > 0 || (this.requestsSent === 0 && this.requestsResponded > 0)) {
      this.btnScanEl.innerText = `error`
      this.btnScanEl.disabled = true
      this.progressEl.innerText = 'some requests responded with error'
      this.progressEl.style.color = '#ac0e00'
    } else {
      this.btnScanEl.innerText = `${this.requestsResponded}/${this.requestsSent}`
      this.btnScanEl.disabled = true
    }
  }

  sortRoutes() {
    this.routes.sort((a, b) => {
      const sumA = a.map(r => r.price).reduce((a, b) => a + b)
      const sumB = b.map(r => r.price).reduce((a, b) => a + b)
      return sumA > sumB ? 1 : sumA < sumB ? -1 : 0
    })
  }

  renderResult(routes) {
    this.progressEl.innerText = `${routes.length} results`
    this.resultEl.innerHTML = `
      <div class="routes">
        ${routes.map(rowRoute => (`
          <div class="row-route">
            <div class="row-route-heading"><strong>${rowRoute.map(r => r.fromCity).join(' - ')} &nbsp; &nbsp; (${this.getDaysBetweenDates(new Date(rowRoute[0].departureTime * 1000), new Date(rowRoute[rowRoute.length - 1].arrivalTime * 1000))} days)</strong> <strong class="route-price">${rowRoute.map(r => r.price).reduce((a, b) => a + b)} ${this.currency}</strong></div>
            ${rowRoute.map(rowFlight => (`
            <div class="row-flight ${rowFlight.flightsPerRoute > 1 ? 'row-alert' : ''}" ${rowFlight.flightsPerRoute > 1 ? ('title="transfers: ' + (rowFlight.flightsPerRoute - 1) + ' !"') : ''}>
              <div>
                <div class="flight-price"><a href="${rowFlight.deepLink}">${rowFlight.price} ${this.currency}</a></div>
                <div>
                  <div class="coll-25">${rowFlight.fromCity} (${rowFlight.fromAirport})</div>
                  <div class="coll-25">${this.fmtDate(new Date(rowFlight.departureTime * 1000), true)}</div>
                  <div class="coll-25">${rowFlight.airlines.join(',')}</div>
                 </div>
                <div>
                  <div class="coll-25">${rowFlight.toCity} (${rowFlight.toAirport})</div>
                  <div class="coll-25">${this.fmtDate(new Date(rowFlight.arrivalTime * 1000), true)}</div>
                  <div class="coll-25"><strong>${rowFlight.flightDuration}</strong></div>
                </div>
              </div>
            </div>
        `)).join('')}</div>`
        )).join('')}
        </div>
      `
  }

  storageSave(label) {
    const data = {
      startDate: this.startDate,
      homeAirport: this.homeAirport,
      currency: this.currency,
      adults: this.adults,
      minNightsInCity: this.minNightsInCity,
      maxNightsInCity: this.maxNightsInCity,
      visitedCitiesMax: this.visitedCitiesMax,
      maxFlightDurationH: this.maxFlightDurationH,
      limitResultsPerRound: this.limitResultsPerRound,
      routes: this.routes,
    };
    if (!!window.localStorage.getItem(`nomad-helper-${label}`)) {
      alert('label already exists, pick another')
      return
    }
    try {
      window.localStorage.setItem(`nomad-helper-${label}`, JSON.stringify(data))
    } catch (e) {
      alert(e.message)
      return
    }
    let labels = []
    try {
      labels = JSON.parse(window.localStorage.getItem('nomad-helper-labels')) || []
    } catch (e) {
      label = []
    }
    labels.push(label)
    window.localStorage.setItem('nomad-helper-labels', JSON.stringify(labels))
    this.storageLoadLabels()
  }

  storageLoad(label) {
    if (this.routes && this.routes.length > 0 && !confirm('there are unsaved results, discard and load?')) {
      return
    }
    const dataStr = window.localStorage.getItem(`nomad-helper-${label}`)
    if (dataStr && dataStr.length > 0) {
      try {
        const data = JSON.parse(dataStr)
        this.startDate = new Date(data.startDate)
        this.homeAirport = data.homeAirport
        this.currency = data.currency
        this.adults = data.adults
        this.minNightsInCity = data.minNightsInCity
        this.maxNightsInCity = data.maxNightsInCity
        this.visitedCitiesMax = data.visitedCitiesMax
        this.maxFlightDurationH = data.maxFlightDurationH
        this.limitResultsPerRound = data.limitResultsPerRound
        this.routes = data.routes

        this.inputStartDateEl.value = this.startDate.toISOString().substr(0, 10)
        this.inputHomeAirportEl.value = this.homeAirport
        this.inputCurrencyEl.value = this.currency
        this.inputAdultsEl.value = this.adults
        this.inputMinNightsInCityEl.value = this.minNightsInCity
        this.inputMaxNightsInCityEl.value = this.maxNightsInCity
        this.inputLimitResultsPerRoundEl.value = this.limitResultsPerRound
        this.searchResultInputEl.hidden = false
        this.renderResult(this.routes)
      } catch (e) {
        console.error(e)
      }
    }
  }

  storageLoadLabels() {
    const getKbCount = label => ((encodeURI(window.localStorage.getItem(`nomad-helper-${label}`)).split(/%..|./).length - 1) / 1024).toFixed(1)
    const dataStr = window.localStorage.getItem('nomad-helper-labels')
    try {
      const data = JSON.parse(dataStr) || []
      for (let i = 0; i < this.storageLoadEl.options.length; i++) {
        this.storageLoadEl.options.remove(i)
      }
      const defaultOption = document.createElement('option')
      defaultOption.innerText = 'load'
      this.storageLoadEl.options.add(defaultOption)
      data.forEach(label => {
        const option = document.createElement('option')
        option.value = label
        option.innerText = `${label} (${getKbCount(label)} Kb)`
        this.storageLoadEl.options.add(option)
      })
    } catch (e) {
      console.error(e)
    }
  }

  isAirportVisited(route, airport) {
    if (airport === this.homeAirport) {
      return false
    }
    const isVisited = route.filter(r => r.fromAirport === airport || r.toAirport === airport)
    return isVisited.length > 0
  }

  getDatePlusDays(date, daysToAdd = 1) {
    const result = new Date(date)
    result.setDate(result.getDate() + daysToAdd)
    return result
  }

  getDaysBetweenDates(firstDate, secondDate) {
    return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / (24 * 60 * 60 * 1000)))
  }

  fmtDate(date, isSimpleFmt = false) {
    if (isSimpleFmt) {
      return date.toISOString().substr(0, 16).replace('T', ' ')
    }
    return `${date.getDate() < 10 ? ('0' + date.getDate().toString()) : date.getDate()}/${date.getMonth() < 9 ? ('0' + (date.getMonth() + 1).toString()) : (date.getMonth() + 1)}/${date.getFullYear()}`
  }
}

const nh = new NomadHelper()
