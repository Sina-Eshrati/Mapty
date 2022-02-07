'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnReset = document.querySelector('.reset');
const editForm = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');
const btnEdit = document.querySelector('.btn--edit');
const inputEditDistance = document.querySelector('.inp--edit--distance');
const inputEditDuration = document.querySelector('.inp--edit--duration');
const inputEditCadence = document.querySelector('.inp--edit--cadence');
const inputEditElevation = document.querySelector('.inp--edit--elevation');
const btnCloseModal = document.querySelector('.btn--close-modal');
const btnSort = document.querySelector('.btn--sort');
const btnShowAll = document.querySelector('.show-all');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////  Application Architecture
class App {
  #map;
  #mapEvent;
  #mapZoom = 13;
  #workouts = [];
  sorted;
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this.delete.bind(this));
    containerWorkouts.addEventListener('click', this.edit.bind(this));
    btnReset.addEventListener('click', this.reset);
    btnSort.addEventListener('click', this.sort.bind(this));
    btnShowAll.addEventListener('click', this.showAll.bind(this));
  }
  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position ');
      }
    );
  }
  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const coords = [latitude, longitude];
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    this.#map = L.map('map').setView(coords, this.#mapZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Save the workouts in local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
           <h2 class="workout__title">${workout.description}
           <button class="edit">Edit</button>
           <button class="delete">Delete</button>
           </h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🚵</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (
      !workoutEl ||
      e.target.classList.contains('delete') ||
      e.target.classList.contains('edit')
    )
      return;
    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      workout =
        workout.type === 'running'
          ? Object.setPrototypeOf(workout, Running.prototype)
          : Object.setPrototypeOf(workout, Cycling.prototype);
      this._renderWorkout(workout);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    localStorage.removeItem('sort');
    location.reload();
  }
  delete(e) {
    const targetEl = e.target.closest('.workout');
    if (!e.target.closest('.delete')) return;
    targetEl.parentNode.removeChild(targetEl);
    const workout = this.#workouts.find(
      workout => workout.id === targetEl.dataset.id
    );
    this.#workouts.splice(this.#workouts.indexOf(workout), 1);
    this._setLocalStorage();
    location.reload();
  }
  edit(e) {
    if (!e.target.closest('.edit')) return;
    const targetEl = e.target.closest('.workout');
    const workout = this.#workouts.find(
      workout => workout.id === targetEl.dataset.id
    );
    editForm.classList.remove('hidden');
    overlay.classList.remove('hidden');
    if (workout.type === 'running') {
      document.querySelector('.elv').classList.add('none');
    } else {
      document.querySelector('.cad').classList.add('none');
    }
    btnCloseModal.addEventListener('click', function () {
      editForm.classList.add('hidden');
      overlay.classList.add('hidden');
      if (workout.type === 'running') {
        setTimeout(
          () => document.querySelector('.elv').classList.remove('none'),
          1000
        );
      } else {
        setTimeout(
          () => document.querySelector('.cad').classList.remove('none'),
          1000
        );
      }
      location.reload();
    });
    btnEdit.addEventListener('click', function (e) {
      e.preventDefault();
      workout.distance = inputEditDistance.value;
      workout.duration = inputEditDuration.value;
      if (!workout.distance || !workout.duration)
        return alert('You must at least fill distance and duration fields!');
      workout.cadence = inputEditCadence.value;
      workout.elevationGain = inputEditElevation.value;
      workout.speed = workout.distance / (workout.duration / 60);
      workout.pace = workout.duration / workout.distance;
      app._setLocalStorage();
      editForm.classList.add('hidden');
      overlay.classList.add('hidden');
      location.reload();
    });
  }
  sort() {
    let boolean = JSON.parse(localStorage.getItem('sort'));
    if (boolean === null) boolean = false;
    this.sorted = boolean;
    console.log(this.sorted);
    this.#workouts = this.sorted
      ? this.#workouts.sort(
          (a, b) =>
            Number.parseInt(
              a.date.replaceAll('-', '').replace('T', '').replaceAll(':', '')
            ) -
            Number.parseInt(
              b.date.replaceAll('-', '').replace('T', '').replaceAll(':', '')
            )
        )
      : this.#workouts.sort((a, b) => a.distance - b.distance);
    this.sorted = !this.sorted;
    this._setLocalStorage();
    localStorage.setItem('sort', JSON.stringify(this.sorted));
    location.reload();
  }
  showAll() {
    let bounds = [];
    this.#workouts.forEach(workout => bounds.push(workout.coords));
    this.#map.fitBounds(bounds);
  }
}

const app = new App();
