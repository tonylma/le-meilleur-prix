import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const StatsPage = ({ apiUrl }) => {
    const [product, setProduct] = useState('Tomate');
    const [city, setCity] = useState('Bouaké');
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchStats = () => {
        if (!product) return;
        setLoading(true);
        const params = new URLSearchParams({ city });
        
        fetch(`${apiUrl}/stats/${product}?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                if (data.labels && data.data) {
                    setChartData({
                        labels: data.labels.map(l => new Date(l).toLocaleDateString()),
                        datasets: [
                            {
                                label: `Prix moyen de ${product} à ${city} (F CFA)`,
                                data: data.data,
                                borderColor: 'rgb(42, 157, 143)',
                                backgroundColor: 'rgba(42, 157, 143, 0.5)',
                            },
                        ],
                    });
                } else {
                    setChartData(null);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };
    
    useEffect(() => {
        fetchStats();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        fetchStats();
    }

    return (
        <div>
            <h1>Statistiques des prix 📊</h1>
            <p>Visualisez l'évolution des prix des produits au fil du temps.</p>

            <form onSubmit={handleSubmit} className="search-filters">
                <div className="form-group">
                    <label>Produit</label>
                    <input type="text" className="form-control" value={product} onChange={e => setProduct(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Ville</label>
                    <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <button type="submit" className="btn" style={{ alignSelf: 'end' }}>Afficher</button>
            </form>

            <div style={{ marginTop: '2rem', backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
                {loading && <p>Chargement du graphique...</p>}
                {!loading && chartData ? (
                    <Line
                        options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: `Historique du prix pour "${product}"` } } }}
                        data={chartData}
                    />
                ) : (
                    !loading && <p>Aucune donnée à afficher pour cette sélection. Essayez un autre produit ou une autre ville.</p>
                )}
            </div>
        </div>
    );
};

export default StatsPage;