# 📈 Monitoramento Pós-Deployment Mobile

## Métricas Essenciais para Monitorar

### 1. **Performance (Lighthouse)**
```
Alvo: > 75 em mobile
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.8s
```

### 2. **Runtime Performance**
- Frame rate: 60 FPS (sem drops)
- Memory: < 100MB
- CPU: < 30% idle

### 3. **Error Tracking**
Monitorar em `window.onerror`:
```javascript
// Já implementado via console.error
// Verificar logs em:
// - Supabase Real-time
// - Vercel Analytics
// - Browser DevTools
```

## 🔍 Verificação de Produção

### Checklist Diário
```
- [ ] Site carrega em mobile (< 3s)
- [ ] Sem console errors
- [ ] Gráficos renderizam correto
- [ ] Sidebar funciona suave
- [ ] Sem layout shift
```

### Teste de Carga
```bash
# Simular 100 usuários simultâneos
# Ferramenta: https://www.webpagetest.org
# Mobile: 4G Slow / 3G Regular

Esperar:
- Site responsivo
- Sem timeout
- Sem 500 errors
```

### Teste de Compatibilidade
```
✓ iPhone 12-15 (Safari)
✓ Android 8+ (Chrome)
✓ iPad/Tablet
✓ Notch devices
```

## 🐛 Debug Mode

### Ativar Verbose Logging
Adicionar em `src/main.tsx`:
```typescript
// Debug em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.DEBUG = true;
}
```

### Monitorar Performance
```javascript
// Performance API (built-in)
window.addEventListener('load', () => {
  const perf = performance.getEntriesByType('navigation')[0];
  console.log({
    'DOM Content Loaded': perf.domContentLoadedEventEnd,
    'Load Event': perf.loadEventEnd,
    'Total': perf.loadEventEnd - perf.fetchStart
  });
});
```

## 📊 Métricas por Página

### Dashboard
- Deve carregar < 1.5s
- Gráficos aparecem em < 2s
- Sem layout shift

### Relatórios
- Pode demorar até 3s (gráficos complexos)
- Sem timeout em 4G

### Transações
- Operações CRUD < 500ms
- Dialog abre suave

## 🚨 Alertas Críticos

Configurar alertas para:
```
1. Build falha
   → Vercel logs
   
2. Deploy revertido
   → Verificar erro
   
3. Performance < 60 em mobile
   → Investigar bottleneck
   
4. Erro rate > 1%
   → Verificar Sentry/Supabase logs
   
5. Uptake < 99.9%
   → Verificar servidor
```

## 📱 User Testing

### Feedback Mobile
Coletar:
```
✓ Tamanho de tela (iPhone X, 11, 12, 13, etc)
✓ Navegador (Safari, Chrome, Firefox)
✓ Conexão (WiFi, 4G, 3G)
✓ Problema específico
✓ Screenshot/vídeo se possível
```

### Bug Report Template
```markdown
**Dispositivo:** iPhone 13, Safari
**OS:** iOS 16.1
**Conexão:** WiFi

**Problema:** Sidebar não desliza

**Passos:**
1. Abrir no mobile
2. Clicar menu
3. Sidebar não aparece

**Esperado:** Sidebar desliza da esquerda
**Real:** Nada acontece

**Screenshot:** [anexar]
```

## 🔧 Performance Tuning

Se performance < 75:

### 1. Verificar Network
```
DevTools > Network > Online (throttle 3G/4G)
- Identificar requests lentos
- Lazy load imagens
```

### 2. Verificar Main Thread
```
DevTools > Performance > Record
- Identificar long tasks (> 50ms)
- Otimizar scripts pesados
```

### 3. Verificar Memory
```
DevTools > Memory > Heap snapshot
- Buscar memory leaks
- Otimizar state management
```

## 🔄 CI/CD Monitoring

### Vercel Analytics
1. Ir em [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecionar projeto
3. Verificar:
   - Build time
   - Deployment time
   - Error logs
   - Performance scores

### GitHub Actions (Se configurado)
1. Ir em Actions
2. Verificar últimos deploys
3. Ver logs de build

## 📝 Documentação para Usuário

Se usuário reportar problema:
```
1. Pedir:
   - Dispositivo exato
   - Versão do navegador
   - Screenshot
   - Passos para reproduzir

2. Informar:
   - Problema já corrigido
   - Versão que corrige
   - Data do fix

3. Follow-up:
   - Confirmar que resolveu
   - Solicitar feedback
```

---

**Last Updated:** 16 de Janeiro de 2026  
**Próxima Review:** 23 de Janeiro de 2026  
**Responsável:** DevOps / QA Team
