import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../services/api';
import './FinancePage.css';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = {
  income: '#4CAF50',
  incomeGlow: 'rgba(76, 175, 80, 0.35)',
  expense: '#E53935',
  expenseGlow: 'rgba(229, 57, 53, 0.35)',
  pieIncome: '#66BB6A',
  pieExpense: '#EF5350',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="finance-tooltip">
      <p className="finance-tooltip-label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="finance-tooltip-value" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const [finances, setFinances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    description: '',
    type: 'INCOME',
    amount: '',
  });

  const fetchFinances = async () => {
    try {
      const response = await api.get('/finance/');
      setFinances(response.data);
    } catch (error) {
      console.error('Erro ao buscar finanças', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinances();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/', {
        description: formData.description,
        type: formData.type,
        amount: parseFloat(formData.amount),
      });
      setFormData({ description: '', type: 'INCOME', amount: '' });
      fetchFinances();
    } catch (error) {
      console.error('Erro ao salvar transação', error);
      alert('Ocorreu um erro ao salvar a transação.');
    }
  };

  const totalIncome = finances
    .filter((f) => f.type === 'INCOME')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = finances
    .filter((f) => f.type === 'EXPENSE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense;

  // Agrupa transações por dia para o gráfico de área
  const areaChartData = useMemo(() => {
    const grouped = {};
    finances.forEach((f) => {
      const day = new Date(f.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      if (!grouped[day]) grouped[day] = { name: day, Receitas: 0, Despesas: 0 };
      if (f.type === 'INCOME') grouped[day].Receitas += f.amount;
      else grouped[day].Despesas += f.amount;
    });
    return Object.values(grouped).reverse();
  }, [finances]);

  const pieData = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return [];
    return [
      { name: 'Receitas', value: totalIncome },
      { name: 'Despesas', value: totalExpense },
    ];
  }, [totalIncome, totalExpense]);

  const PIE_COLORS = [COLORS.pieIncome, COLORS.pieExpense];

  return (
    <div className="finance-page">
      <div className="finance-header">
        <h1>Gestão Financeira</h1>
      </div>

      {/* Summary Cards */}
      <div className="finance-summary">
        <div className="summary-card income">
          <div className="summary-icon income-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div className="summary-text">
            <h3>Total Entradas</h3>
            <span className="amount">{formatCurrency(totalIncome)}</span>
          </div>
        </div>
        <div className="summary-card expense">
          <div className="summary-icon expense-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
          </div>
          <div className="summary-text">
            <h3>Total Saídas</h3>
            <span className="amount">{formatCurrency(totalExpense)}</span>
          </div>
        </div>
        <div className="summary-card balance">
          <div className="summary-icon balance-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="summary-text">
            <h3>Saldo Atual</h3>
            <span className="amount">{formatCurrency(balance)}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="finance-charts">
        <div className="finance-section chart-area-section">
          <h2>Evolução Diária</h2>
          <div className="chart-container-lg">
            {areaChartData.length === 0 ? (
              <p className="no-data">Registre transações para ver o gráfico.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.income} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.income} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.expense} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-300)" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="Receitas" stroke={COLORS.income} strokeWidth={2.5} fill="url(#gradIncome)" dot={{ r: 4, fill: COLORS.income, strokeWidth: 0 }} activeDot={{ r: 6, stroke: COLORS.income, strokeWidth: 2, fill: '#fff' }} />
                  <Area type="monotone" dataKey="Despesas" stroke={COLORS.expense} strokeWidth={2.5} fill="url(#gradExpense)" dot={{ r: 4, fill: COLORS.expense, strokeWidth: 0 }} activeDot={{ r: 6, stroke: COLORS.expense, strokeWidth: 2, fill: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="finance-section chart-pie-section">
          <h2>Distribuição</h2>
          <div className="chart-container-pie">
            {pieData.length === 0 ? (
              <p className="no-data">Sem dados para exibir.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} style={{ filter: `drop-shadow(0 2px 6px ${PIE_COLORS[index]}55)` }} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Form + Transactions */}
      <div className="finance-content">
        <div className="finance-section">
          <h2>Nova Transação</h2>
          <form className="finance-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Descrição</label>
              <input
                type="text"
                name="description"
                className="input-field"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="Ex: Corte de cabelo"
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <div className="type-toggle">
                <button
                  type="button"
                  className={`type-toggle-btn income-toggle ${formData.type === 'INCOME' ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'INCOME' }))}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  Receita
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn expense-toggle ${formData.type === 'EXPENSE' ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'EXPENSE' }))}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                  Despesa
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Valor (R$)</label>
              <input
                type="number"
                name="amount"
                className="input-field"
                value={formData.amount}
                onChange={handleInputChange}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full">Registrar Transação</button>
          </form>
        </div>

        <div className="finance-section">
          <h2>Últimas Transações</h2>
          {loading ? (
            <div className="empty-state"><div className="spinner spinner-lg" /></div>
          ) : finances.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              <p>Nenhuma transação registrada.</p>
            </div>
          ) : (
            <div className="transactions-list">
              {finances.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-left">
                    <div className={`transaction-icon-badge ${transaction.type === 'INCOME' ? 'income' : 'expense'}`}>
                      {transaction.type === 'INCOME' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                      )}
                    </div>
                    <div className="transaction-info">
                      <span className="transaction-desc">{transaction.description}</span>
                      <span className="transaction-date">
                        {new Date(transaction.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <span className={`transaction-amount ${transaction.type === 'INCOME' ? 'income' : 'expense'}`}>
                    {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
