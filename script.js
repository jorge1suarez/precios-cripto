/**
 * Fuente de datos y modelado
 */

// Conectammos nuestra aplicación al API de coincap.
// Vamos a solicitar actualizaciones de precios para: bitcoin, ethereum, monero y litecoin.
var EndPoint2 = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cethereum%2Clitecoin%2Cmonero&vs_currencies=usd"

var EndPoint1 = "wss://ws.coincap.io/prices?assets=bitcoin,ethereum,monero,litecoin"

var preciosEndPoint = new WebSocket(EndPoint1);

// Cuando una de las criptomonedas cambia de precio, ejecutamos la función procesarNuevoMensaje.
preciosEndPoint.onmessage = procesarNuevoMensaje;

/**
 * Preprocesamiento y Modelado:
 * El API nos envía sólo 1 tipo de dato que es el precio actual de las criptomonedas.
 * A pesar de esto, podemos hacer cálculos matemáticos para producir una estructura de datos que nos permita darle sentido al cambio de precios que vamos a mostrar en la visualización.
 */
const monedas = [
  {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}, 
  {nombre: "ethereum", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []},
  {nombre: "monero", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []},
  {nombre: "litecoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
];
// variable que cuenta el número de datos recolectados
var numdatos = 0;  

// Función que recibe los mensajes del Socket
function procesarNuevoMensaje(mensaje) {
  // Convertimos los datos de texto a formato JSON
  var mensajeJson = JSON.parse(mensaje.data);
  numdatos = numdatos + 1;
  
  // Iteramos sobre los valores del mensaje que vienen en parejas de "nombre": "precio"
  for (var nombreMoneda in mensajeJson) {
    // En el siguiente loop, pasamos por cada objeto que definimos en la variable "monedas" que contiene la nueva estructura de datos que queremos llenar.
    for (var i = 0; i < monedas.length; i++) {
      // objetoMoneda va a ser cada uno de los objetos del modelado, por ejemplo:
      // cuando i = 0, objetoMoneda es: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
      var objetoMoneda = monedas[i];

      // Comparamos el nombre de la moneda en nuestro modelo con el nombre de la moneda que cambió de valor y fue enviado por la API en el mensaje actual.
      // Si coinciden, significa que podemos actualizar los datos de nuestro modelo para esa moneda
      if (objetoMoneda.nombre === nombreMoneda) {
        // Extraemos el precio actual que llegó en el mensaje y lo guardamos en una variable para usarla varias veces de ahora en adelante.
        var nuevoPrecio = mensajeJson[nombreMoneda];

        // En JavaScript, podemos insertar un nuevo elemento a un array usando push()
        // Aquí estamos sumando una nueva entrada a los datos de la moneda que acaba de cambiar el precio.
        // En nuestra estructura de modelado: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
        // va a quedar guardada en el array "datos"
        objetoMoneda.datos.push({
          fecha: Date.now(), // Este va a ser nuestro eje X, usamos la fecha del presente ya que la aplicación funciona en tiempo real.
          precio: nuevoPrecio, // El eje Y en la visualización va a ser el precio.
        });

        // Volviendo a la estructura: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
        // podemos cambiar directamente el precioActual de la moneda con el precio que acaba de llegar de la API.
        objetoMoneda.precioActual = nuevoPrecio;

        // Ahora hagamos algo más interesante, vamos a guardar el precio más alto al que ha llegado la moneda.
        // La siguiente comparación revisa si el valor NO es "null" con: !objetoMoneda.precioMasAlto,
        // O si el precio que acaba de llegar es mayor al precioMasAlto guardado en nuestro modelo.
        if (!objetoMoneda.precioMasAlto || objetoMoneda.precioMasAlto < nuevoPrecio) {
          // Si alguna de estas dos pruebas es verdadera, cambiamos el precioMasAlto en el modelo.
          objetoMoneda.precioMasAlto = nuevoPrecio;
        }
        // Hacemos lo mismo para el precioMasBajo haciendo la comparación invertida.
        if (!objetoMoneda.precioMasBajo || objetoMoneda.precioMasBajo > nuevoPrecio) {
          objetoMoneda.precioMasBajo = nuevoPrecio;
        }

        // Para terminar, actualizamos la gráfica que tengamos seleccionada en el menú
        if (nombreMoneda === menu.value) {
          actualizar(monedas[i]);
        }
      }
    }
  }
}
/** FIN de Preprocesamiento y modelado. */

/**
 * Visualización y textos dinámicos
 */

var contexto1 = document.getElementById('contexto1');
var contexto2 = document.getElementById('contexto2');
//Se crea fecha
var fecha = document.getElementById('fecha');
var hoy = new Date()
fecha.innerText = hoy.getFullYear() + "-" + (hoy.getMonth() + 1) + "-" + hoy.getDate();
// Contador dinámico
var contador = document.getElementById('contador');

var formatoUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// Pueden cambiar los valores de estas variables para cambiar el tamaño del contenedor.
// Usamos márgenes para darle espacio a los textos de cada eje.
var margen = { top: 10, right: 30, bottom: 30, left: 100 };
var ancho = 800 - margen.left - margen.right;
var alto = 400 - margen.top - margen.bottom;

// En D3 seleccionamos el elemento de HTML donde vamos a insertar la gráfica, en index.html es: <div id="modulo2"></div>
const svg = d3
  .select('#modulo2') // elemento existente en el HTML para insertar gráfica
  .append('svg')
  .attr('width', ancho + margen.left + margen.right)
  .attr('height', alto + margen.top + margen.bottom)
  .append('g')
  .attr('transform', `translate(${margen.left},${margen.top})`);

// Definición general de cada eje:
// El eje x es el tiempo que en nuestros datos guardamos en cada instancia usando Date.now(), que representa la fecha
// D3 puede procesar fechas usando la escala "scaleTime()"
// El rango va de 0 al ancho de la gráfica.
const x = d3.scaleTime().range([0, ancho]);
const ejeX = d3.axisBottom().scale(x);
svg.append('g').attr('transform', `translate(0, ${alto})`).attr('class', 'ejeX');

// El eje Y representa la variación de precios.
// Usamos la escala lineal en D3:
const y = d3.scaleLinear().range([alto, 0]);
const ejeY = d3.axisLeft().scale(y);
svg.append('g').attr('class', 'ejeY');


function actualizar(objetoMoneda) {
  contexto1.innerText = "- " + menu.value + ": " + formatoUSD.format(objetoMoneda.precioActual) + " USD.";

  var precioInicial = objetoMoneda.datos[0].precio;

  if (precioInicial < objetoMoneda.precioActual) {
    var diferencia = objetoMoneda.precioActual - precioInicial;
    contexto2.innerText = "subió + " + formatoUSD.format(diferencia);
  } else if (precioInicial > objetoMoneda.precioActual) {
    var diferencia = precioInicial - objetoMoneda.precioActual;
    contexto2.innerText = "bajó - " + formatoUSD.format(diferencia);
  } else {
    contexto2.innerText = "igual = 0";
  }
//
contador.innerText = "Número de datos recolectados = " + numdatos;
  
// El eje X que definimos antes lo actualizamos con un método de d3 que busca el rango de fechas en todos los datos disponibles hasta el momento.
// Van a ver que al principio este rango es muy pequeño y se va incrementando a medida que hay más datos.
// Los dominios en d3 se definen con un array con dos valores, el primero es el mínimo y el segundo el máximo:
// x.domain([min, max])
x.domain(
  d3.extent(objetoMoneda.datos, function (d) {
    return d.fecha;
  })
);
// Hace una transición animada al actualizar el ejeX, la duración es de 300 milisegundos
svg.selectAll('.ejeX').transition().duration(300).call(ejeX);

// Otra forma de definir el rango del dominio es buscar el menor y mayor valor en los datos.
// El método d3.extent hace exactamente lo mismo, pero dejo este diferente como ejemplo.
// Intenten cambiar esto por: y.domain([0, d3.max(objetoMoneda.datos, function (d) { return d.precio; })]);
// y verán que es difícil ver los cambios. Acá estamos cortando la base para que no comience en 0 sino en el menor precio.

y.domain([
  d3.min(objetoMoneda.datos, function (d) {
    return d.precio;
  }),
  d3.max(objetoMoneda.datos, function (d) {
    return d.precio;
  }),
]);
svg.selectAll('.ejeY').transition().duration(300).call(ejeY);

// Pasamos los datos actuales a la línea que vamos a pintar
const linea = svg.selectAll('.linea').data([objetoMoneda.datos], function (d) {
  return d;
});

// Finalmente pintamos la línea
linea
  .join('path')
  .attr('class', 'linea')
  .transition()
  .duration(300)
  .attr(
    'd',
    d3
      .line()
      .x(function (d) {
        return x(d.fecha); // El eje X son las fechas
      })
      .y(function (d) {
        return y(d.precio); // El eje Y son los precios
      })
  )
  .attr('fill', 'none')
  .attr('stroke', '#42b3f5') // Pueden cambiar el color de la línea
  .attr('stroke-width', 2.5); // Grosor de la línea
}
// FIN de Visualización y textos dinámicos



/**
 * MENÚ
 */
var menu = document.getElementById("menuMonedas");

menu.onchange = function() {
  var objetoMoneda = monedas.find(function(obj) { return obj.nombre === menu.value });
  actualizar(objetoMoneda);
}
// ----- FIN MENÚ ----