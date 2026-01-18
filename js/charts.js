// --- FONCTIONS GRAPHIQUES --- //
const initCharts = () => {
	// Chart Puissance
	const ctxPotency = document.getElementById('potencyChart');
	if (ctxPotency) {
		new Chart(ctxPotency, {
			type: 'bar',
			data: {
				labels: ['Sativa','Indica','Exotic','Dry Sift','Ice-O-Lator','Rosin','BHO'],
				datasets: [{
					label: '% THC',
					data: [15,20,28,40,65,75,90],
					backgroundColor: ['#10B981','#10B981','#10B981','#D97706','#2563EB','#9333EA','#64748B'],
					borderRadius: 4
				}]
			},
			options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: false } }
		});
	}

	// Radar Comparateur
	updateComparator();

	// Plotly Matrix
	if(document.getElementById('globalMatrixPlot')) {
		Plotly.newPlot('globalMatrixPlot', [{
			x: Object.values(masterData).map(d => d.matrix.x),
			y: Object.values(masterData).map(d => d.matrix.y),
			text: Object.values(masterData).map(d => d.name),
			mode: 'markers+text',
			type: 'scatter',
			textposition: 'top center',
			marker: { size: 30, color: Object.values(masterData).map(d => d.hex) }
		}], {
			xaxis: { title: 'Pureté', range: [0, 100] },
			yaxis: { title: 'Solidité', range: [0, 12] },
			margin: { t: 20, l: 40 },
			paper_bgcolor: 'rgba(0,0,0,0)',
			plot_bgcolor: 'rgba(0,0,0,0)'
		}, { displayModeBar: false });
	}
};

function updateComparator() {
	const selectA = document.getElementById('selectA');
	const selectB = document.getElementById('selectB');
	
	// Sécurité si les éléments n'existent pas encore dans le DOM
	if(!selectA || !selectB) return;

	const dA = masterData[selectA.value || "weed_sativa"];
	const dB = masterData[selectB.value || "hash_rosin"];
	
	const ctx = document.getElementById('comparatorRadar');
	if(!ctx) return;

	if (comparatorChart) {
		comparatorChart.destroy();
	}
	
	comparatorChart = new Chart(ctx, {
		type: 'radar',
		data: {
			labels: ['Fruité','Terreux','Physique','Odeur','Intensité'],
			datasets: [
				{ label: dA.name, data: dA.radar, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.2)' },
				{ label: dB.name, data: dB.radar, borderColor: '#EC4899', backgroundColor: 'rgba(236,72,153,0.2)' }
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
		}
	});
}

// --- AFFICHAGE DÉTAILS ---
function showDetail(k) {
	const d = masterData[k];
	showView('detail');
	
	document.getElementById('detail-header').className = `bg-white p-8 rounded-2xl shadow-lg border-t-8 border-${d.color}-500`;
	const badge = document.getElementById('detail-badge');
	badge.innerText = d.badge;
	badge.className = `px-3 py-1 rounded-full text-sm font-bold uppercase mb-2 inline-block bg-${d.color}-100 text-${d.color}-800`;
	
	const title = document.getElementById('detail-title');
	title.innerText = d.name;
	title.className = `text-4xl md:text-5xl font-black text-${d.color}-900`;
	
	document.getElementById('detail-icon').innerText = d.icon;
	document.getElementById('detail-desc').innerText = d.desc;
	document.getElementById('detail-desc').className = `text-lg text-slate-600 border-l-4 border-${d.color}-200 pl-4 text-justify`;
	
	document.getElementById('detail-flow').innerHTML = d.process.map(s => `
		<div class="bg-slate-700 p-4 rounded-lg border border-slate-600">
			<div class="text-xs text-${d.color}-400 font-mono uppercase">${s.t}</div>
			<div class="font-bold">${s.d}</div>
		</div>`).join('');

	const c1 = document.getElementById('detailRadarChart');
	const c2 = document.getElementById('detailBarChart');
	
	// Stockage des instances de chart sur l'élément DOM (méthode simplifiée)
	if (c1.chartInstance) c1.chartInstance.destroy();
	if (c2.chartInstance) c2.chartInstance.destroy();

	c1.chartInstance = new Chart(c1, {
		type: 'radar',
		data: {
			labels: ['Fruité','Terreux','Physique','Odeur','Intensité'],
			datasets: [{ label: d.name, data: d.radar, backgroundColor: `${d.hex}33`, borderColor: d.hex, fill: true }]
		},
		options: { maintainAspectRatio: false, plugins: { legend: false } }
	});

	c2.chartInstance = new Chart(c2, {
		type: 'bar',
		data: {
			labels: ['Rendement','Puissance','Prix','Tech'],
			datasets: [{ data: d.metrics, backgroundColor: d.hex, borderRadius: 6 }]
		},
		options: { maintainAspectRatio: false, plugins: { legend: false }, scales: { y: { max: 100 } } }
	});
}
