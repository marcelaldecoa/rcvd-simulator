# Glossary / Glossário — English ⇄ Português (Brasil)

Bilingual reference for *Race Car Vehicle Dynamics* and this simulator.
Referência bilíngue para *Race Car Vehicle Dynamics* e para este simulador.

**A note on usage.** Brazilian motorsport keeps a good many English terms in
everyday paddock speech even where a perfectly good Portuguese term exists —
*setup*, *grip*, *understeer*, *bump steer*, *stint*. Where that is the case the
table marks it **⚑ usa-se em inglês**, and gives the Portuguese term anyway,
because the Portuguese is what you need for written engineering work, coursework
and anything formal.

**Sobre o uso.** O automobilismo brasileiro mantém vários termos em inglês na
fala do dia a dia mesmo havendo termo em português — *setup*, *grip*,
*understeer*, *bump steer*, *stint*. Nesses casos a tabela marca **⚑ usa-se em
inglês** e traz o termo em português mesmo assim, porque é ele que se usa em
texto técnico, em prova e em documento formal.

Symbols follow the book's notation. | Os símbolos seguem a notação do livro.

---

## 1. The car and its geometry — O carro e sua geometria

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Wheelbase | Entre-eixos | $L$ | Distância entre os centros das rodas dianteira e traseira |
| Track (width) | Bitola | $t$ | Distância entre as rodas de um mesmo eixo |
| Centre of gravity | Centro de gravidade | $h$ (altura) | Abrev. CG; "centro de massa" também é correto |
| Sprung mass | Massa suspensa | $m_s$ | O que se apoia sobre as molas |
| Unsprung mass | Massa não suspensa | $m_u$ | Rodas, freios, cubos, metade dos braços |
| Yaw moment of inertia | Momento de inércia em guinada | $I_{zz}$ | |
| Radius of gyration | Raio de giração | $k$ | $I_{zz} = m k^2$ |
| Dynamic index | Índice dinâmico | $I_{zz}/(mab)$ | Unitário ⇒ eixos respondem de forma independente |
| Front / rear axle load | Carga no eixo dianteiro / traseiro | $W_f$, $W_r$ | |
| Weight distribution | Distribuição de peso | — | "Distribuição de massa" |
| Corner weights | Pesagem por roda | — | Prática de balança; "peso por canto" |
| Cross weight | Peso cruzado | — | Em oval chama-se "wedge" ⚑ — sentido diferente de cunha |
| Ride height | Altura de rodagem | — | "Altura livre do solo" |
| Sprung / unsprung CG height | Altura do CG suspenso / não suspenso | $h_s$, $h_u$ | |

## 2. Tires — Pneus

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Slip angle | Ângulo de deriva | $\alpha$ | Entre o plano da roda e sua direção de deslocamento |
| Slip ratio | Taxa de escorregamento longitudinal | $SR$, $\kappa$ | |
| Cornering stiffness | Rigidez em curva | $C_\alpha$ | Inclinação de $F_y$ vs $\alpha$ na origem, N/rad |
| Camber stiffness | Rigidez de cambagem | $C_\gamma$ | |
| Camber | Cambagem | $\gamma$ | Inclinação da roda no plano transversal |
| Camber thrust | Empuxo de cambagem | — | Força lateral gerada só pela cambagem |
| Toe-in / toe-out | Convergência / divergência | — | Genericamente "toe" ⚑ |
| Contact patch | Área de contato | — | "Impressão de contato" |
| Lateral force | Força lateral | $F_y$ | |
| Longitudinal force | Força longitudinal | $F_x$ | |
| Vertical load | Carga vertical | $F_z$ | |
| Aligning torque | Torque autoalinhante | $M_z$ | "Momento autoalinhante" |
| Overturning moment | Momento de tombamento | $M_x$ | |
| Pneumatic trail | Rastro pneumático | $t_p$ | "Avanço pneumático" |
| Mechanical trail | Rastro mecânico | $t_m$ | Vem do cáster |
| Load sensitivity | Sensibilidade à carga | — | μ cai com o aumento da carga vertical |
| Friction coefficient | Coeficiente de atrito | $\mu$ | |
| Friction ellipse / circle | Elipse / círculo de atrito | — | |
| Combined slip | Escorregamento combinado | — | Lateral e longitudinal simultâneos |
| Relaxation length | Comprimento de relaxação | $\sigma_r$ | Distância para a força se estabelecer |
| Adhesion / sliding zone | Zona de aderência / escorregamento | — | Regiões da área de contato |
| Magic Formula | Fórmula Mágica | — | Normalmente mantida em inglês ⚑ |
| Nondimensionalisation (Radt) | Adimensionalização (Radt) | — | Colapsa curvas de vários $F_z$ em uma só |
| Master curve | Curva mestra | $\bar F(\bar\alpha)$ | A curva única que resulta do colapso |
| Normalised slip angle | Ângulo de deriva normalizado | $\bar\alpha = C_\alpha\tan\alpha/\mu_yF_z$ | Quanto se pede do pneu, como fração do que ele tem |
| Normalised force | Força normalizada | $\bar F_y = F_y/\mu_yF_z$ | Força sobre o pico naquela carga |
| Brush model | Modelo de escova | — | Também "modelo de cerdas"; "Fiala" ⚑ |
| Grip | Aderência | — | ⚑ usa-se em inglês |
| Tread | Banda de rodagem | — | |
| Carcass | Carcaça | — | |
| Tire pressure | Pressão dos pneus | — | |
| Rolling resistance | Resistência ao rolamento | $f_r$ | |
| Conicity / ply steer | Conicidade / ply steer | — | *Ply steer* costuma ficar em inglês ⚑ |
| Wear / degradation | Desgaste / degradação | — | "Deg" ⚑ |
| Slick | Slick | — | Pneu liso ⚑ |

## 3. Motion and axes — Movimento e eixos

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Yaw | Guinada | $\psi$, $r$ | Rotação em torno do eixo vertical |
| Pitch | Arfagem | $\theta$ | Rotação em torno do eixo transversal |
| Roll | Rolagem | $\phi$ | Rotação em torno do eixo longitudinal |
| Yaw rate | Velocidade de guinada | $r$ | "Taxa de guinada", rad/s |
| Sideslip angle | Ângulo de deriva do veículo | $\beta$ | No CG; não confundir com $\alpha$ do pneu |
| Lateral acceleration | Aceleração lateral | $A_y$ | |
| Longitudinal acceleration | Aceleração longitudinal | $A_x$ | |
| Heading | Direção de apontamento (proa) | $\psi$ | Para onde o carro aponta |
| Course | Direção de deslocamento | $\psi + \beta$ | Para onde o carro realmente vai |
| Path radius | Raio da trajetória | $R$ | |
| Body-fixed axes | Eixos fixos ao corpo | — | "Referencial do veículo" |
| Earth-fixed axes | Eixos fixos à Terra | — | Referencial inercial |
| Degrees of freedom | Graus de liberdade | DOF | |
| Free body diagram | Diagrama de corpo livre | — | |
| Transport term | Termo de transporte | $Vr$ | Aparece em referencial girante |

## 4. Steady-state handling — Comportamento em regime permanente

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Steady state | Regime permanente | — | "Estado estacionário" |
| Understeer | Subesterço / subesterçante | $K > 0$ | ⚑ usa-se em inglês; "saída de frente", "o carro empurra" |
| Oversteer | Sobre-esterço / sobre-esterçante | $K < 0$ | ⚑ usa-se em inglês; "traseira solta", "rabeia" |
| Neutral steer | Esterço neutro | $K = 0$ | |
| Understeer gradient | Gradiente de subesterço | $K$ | deg/g ou rad/g |
| Cornering compliance | Complacência em curva | $D_f$, $D_r$ | Bundorf; $K = D_f - D_r$ |
| Understeer budget | Balanço de subesterço | — | Decomposição de $K$ por mecanismo |
| Roll understeer / roll oversteer | Subesterço / sobre-esterço por rolagem | — | Esterçamento do eixo em rolagem; no traseiro, estabiliza |
| Steer angle (road wheel) | Ângulo de esterçamento da roda | $\delta$ | |
| Steering wheel angle | Ângulo do volante | — | |
| Steering ratio | Relação de direção | $G_s$ | |
| Ackermann angle | Ângulo de Ackermann | $L/R$ | Referência geométrica |
| Ackermann geometry | Geometria de Ackermann | — | |
| Anti-Ackermann | Anti-Ackermann | — | Roda interna esterça menos |
| Stability factor | Fator de estabilidade | $1 + KV^2/gL$ | Denominador comum dos ganhos |
| Yaw velocity gain | Ganho de velocidade de guinada | $r/\delta$ | |
| Lateral acceleration gain | Ganho de aceleração lateral | $A_y/\delta$ | |
| Characteristic speed | Velocidade característica | $V_{char}$ | Só para carro subesterçante |
| Critical speed | Velocidade crítica | $V_{crit}$ | Só para sobre-esterçante; divergência |
| Tangent speed | Velocidade tangente | $V_{tan}$ | Onde $\beta$ troca de sinal |
| Neutral steer point | Ponto de esterço neutro | — | |
| Static margin | Margem estática | — | Distância CG→NSP, em % do entre-eixos |
| Stability derivative | Derivada de estabilidade | $N_\beta$, $Y_\beta$… | Herança da estabilidade de aeronaves |
| Stability (Moment Method) | Estabilidade (Método dos Momentos) | $\partial N/\partial A_y$ | A $\delta$ constante; negativa = estável |
| Control (Moment Method) | Controle (Método dos Momentos) | $\partial N/\partial\delta$ | A $A_y$ constante; $K \propto$ −estabilidade/controle |
| Directional stability | Estabilidade direcional | $N_\beta$ | "Estabilidade de cata-vento" |
| Balance | Equilíbrio / balanço | — | ⚑ "balance" é comum no paddock |
| Limit | Limite | — | |
| Skid pad | Pista circular de teste | — | ⚑ usa-se em inglês |

## 5. Transient response — Resposta transiente

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Transient | Transiente | — | |
| Natural frequency | Frequência natural | $\omega_n$ | rad/s ou Hz |
| Damped frequency | Frequência amortecida | $\omega_d$ | |
| Damping ratio | Fator de amortecimento | $\zeta$ | "Razão de amortecimento" |
| Digressive damping | Amortecimento digressivo | — | Firme abaixo do joelho, mais plano acima |
| Progressive damping | Amortecimento progressivo | — | O oposto; resiste a eventos de alta velocidade |
| Blow-off valve | Válvula de alívio | — | ⚑ "blow-off"; limita o pico sobre zebras |
| Knee (damper curve) | Joelho da curva | — | Velocidade onde a inclinação muda |
| Jacking down | Afundamento progressivo | — | ⚑ "jacking down"; rebote lento demais entre ondulações |
| Contact patch load variation | Variação de carga na área de contato | — | Objetivo real do amortecedor; medida em RMS |
| 7-post rig | Bancada de 7 atuadores | — | ⚑ "7-post"; entradas nas rodas mais heave, pitch e roll |
| Damper velocity histogram | Histograma de velocidade do amortecedor | — | Mostra que parte da curva importa naquele circuito |
| Underdamped / overdamped | Subamortecido / superamortecido | — | |
| Critically damped | Criticamente amortecido | $\zeta = 1$ | |
| Overshoot | Sobressinal | — | ⚑ "overshoot" é comum |
| Rise time | Tempo de subida | — | |
| Settling time | Tempo de acomodação | — | |
| Step steer | Degrau de esterçamento | — | Entrada em degrau no volante |
| Frequency response | Resposta em frequência | — | "Varredura senoidal" (sine sweep) |
| Transfer function | Função de transferência | — | |
| Eigenvalue | Autovalor | — | |
| Root locus | Lugar das raízes | — | |
| Divergence | Divergência | — | Instabilidade não oscilatória |
| Lead time constant | Constante de tempo do zero | $\tau_r$ | Termo de avanço da resposta em guinada |
| "Taking a set" | "Assentar o carro" | — | Atraso entre guinada e aceleração lateral |

## 6. Load transfer and pair analysis — Transferência de carga e análise por eixo

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Load transfer | Transferência de carga | $\Delta F_z$ | |
| Lateral load transfer | Transferência lateral de carga | — | |
| Longitudinal (weight) transfer | Transferência longitudinal de carga | — | |
| Lateral load transfer distribution | Distribuição da transferência lateral de carga | — | ⚑ abrev. TLLTD, usada em inglês |
| Roll centre | Centro de rolagem | $h_{RC}$ | |
| Roll axis / neutral roll axis | Eixo de rolagem | NRA | Linha entre os centros de rolagem |
| Roll moment arm | Braço de momento de rolagem | $H$ | Do CG suspenso ao eixo de rolagem |
| Roll stiffness | Rigidez à rolagem | $K_\phi$ | N·m/rad |
| Bar mount compliance | Complacência da fixação da barra | — | Em série com a barra; impõe um teto |
| Roll gradient | Gradiente de rolagem | — | deg/g |
| Roll angle | Ângulo de rolagem | $\phi$ | |
| Geometric load transfer | Transferência geométrica | — | Pelos braços da suspensão |
| Elastic load transfer | Transferência elástica | — | Por molas e barra estabilizadora |
| Anti-roll bar | Barra estabilizadora | — | Abrev. ARB; também "barra anti-rolagem", ou só "barra" |
| Jacking | Efeito de macaco | — | ⚑ "jacking" |
| Wheel lift | Levantamento da roda interna | — | |
| Axle characteristic | Curva característica do eixo | — | $F_y$ do eixo vs $\alpha$ |
| Pair analysis | Análise por par (eixo) | — | Ch 7 |
| Limiting axle | Eixo limitante | — | O que satura primeiro |
| Chassis torsional stiffness | Rigidez torcional do chassi | — | |

## 7. Springs, dampers, geometry — Molas, amortecedores, geometria

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Spring rate | Constante da mola | $K_s$ | "Rigidez da mola", N/m |
| Wheel rate | Rigidez na roda | $K_w$ | $K_w = K_s \cdot IR^2$ |
| Ride rate | Rigidez vertical total | $K_R$ | Inclui o pneu em série |
| Ride frequency | Frequência de suspensão | — | Hz |
| Flat ride | Marcha plana | — | Critério de Olley: traseira 10-20% acima da dianteira |
| Axle roll rate | Rigidez à rolagem do eixo | $K_\phi = K_R t^2/2$ | Molas mais barra, referidas às rodas |
| Installation ratio | Razão de instalação | $IR$ | ⚑ também "motion ratio" |
| Damper / shock absorber | Amortecedor | — | |
| Damping | Amortecimento | $C$ | |
| Bump / compression | Compressão | — | ⚑ "bump" |
| Rebound / extension | Extensão / retorno | — | ⚑ "rebound" |
| Low-speed / high-speed damping | Amortecimento de baixa / alta velocidade | — | Velocidade do amortecedor, não do carro |
| Wheel hop | Salto da roda | — | Modo de 12–20 Hz; ⚑ "wheel hop" |
| Heave spring / third element | Mola de heave / terceiro elemento | — | ⚑ "heave spring"; separa rigidez de heave da de rolagem |
| Bump rubber / packer | Batente progressivo | — | ⚑ "bump rubber"; elemento de carga em alta velocidade |
| Torsion bar | Barra de torção | — | |
| Coil spring | Mola helicoidal | — | |
| Leaf spring | Mola de lâminas (feixe de molas) | — | |
| Tender / helper spring | Mola auxiliar | — | ⚑ "tender spring" |
| Preload | Pré-carga | — | |
| Bump stop | Batente | — | ⚑ "bump stop" |
| Instant centre | Centro instantâneo | — | |
| Swing arm length (FVSA/SVSA) | Comprimento do braço virtual | — | Vista frontal / lateral |
| Camber curve / camber gain | Curva de cambagem / ganho de cambagem | — | |
| Bump steer | Esterçamento por curso da suspensão | — | ⚑ usa-se em inglês |
| Roll steer | Esterçamento por rolagem | — | |
| Roll camber | Cambagem por rolagem | — | Cambagem ganha em relação ao solo por grau de rolagem |
| Anti-dive / anti-squat | Anti-mergulho / anti-agachamento | — | |
| Compliance | Complacência | — | "Flexibilidade" estrutural |
| Compliance steer | Esterçamento por complacência | — | |
| Double wishbone | Duplo braço em A | — | "Duplo A" |
| MacPherson strut | Suspensão McPherson | — | |
| K&C rig | Bancada K&C | — | Cinemática e complacência |

## 8. Steering and brakes — Direção e freios

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Caster | Cáster | — | Ângulo de avanço do pino mestre |
| Kingpin inclination | Inclinação do pino mestre | — | Abrev. KPI |
| Scrub radius | Raio de scrub | — | "Braço a terra"; ⚑ "scrub radius" |
| Steering torque / feel | Torque na direção / feedback | — | ⚑ "feedback" |
| Rack | Cremalheira | — | |
| Brake bias | Distribuição de frenagem | — | ⚑ "bias de freio" |
| Balance bar | Barra de balanço dos freios | — | Ajusta a razão de pressão dianteira/traseira |
| Ideal brake bias | Distribuição ideal de frenagem | $b/L + A_x h/L$ | Sobe com a desaceleração |
| Braking | Frenagem | — | |
| Traction | Tração | — | |
| Traction limit | Limite de tração | — | |
| Differential | Diferencial | — | |
| Limited-slip differential | Diferencial de escorregamento limitado | — | "Diferencial bloqueante"; ⚑ abrev. LSD |
| Torque bias ratio | Razão de bloqueio | — | Abrev. TBR |
| Spool | Diferencial travado | — | ⚑ "spool" |
| Ramp angle | Ângulo de rampa | — | |
| Locking | Bloqueio | — | |
| Wheelspin | Patinagem | — | |
| Lock-up | Travamento (da roda) | — | |

## 9. Aerodynamics — Aerodinâmica

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Downforce | Força descendente | — | ⚑ usa-se em inglês quase sempre |
| Drag | Arrasto | $C_D A$ | |
| Lift | Sustentação | $C_L A$ | |
| Dynamic pressure | Pressão dinâmica | $q$ | $q = \tfrac12 \rho V^2$ |
| Pressure coefficient | Coeficiente de pressão | $C_p$ | |
| Reynolds number | Número de Reynolds | $Re$ | |
| Boundary layer | Camada limite | — | |
| Separation | Descolamento | — | Da camada limite |
| Ground effect | Efeito solo | — | |
| Diffuser | Difusor | — | |
| Wing / aerofoil | Asa / aerofólio | — | |
| Angle of attack | Ângulo de ataque | — | |
| Aspect ratio | Alongamento | $AR$ | "Razão de aspecto" |
| Induced drag | Arrasto induzido | — | |
| Gurney flap | Gurney | — | ⚑ usa-se em inglês |
| Splitter / dam | Splitter / defletor dianteiro | — | ⚑ usa-se em inglês |
| Rake | Rake | — | Inclinação longitudinal; ⚑ inglês |
| Aero balance | Balanço aerodinâmico | — | Centro de pressão em % do entre-eixos |
| Centre of pressure | Centro de pressão | — | |
| Platform stability | Estabilidade de plataforma | — | Controle de altura/atitude |
| Wind tunnel | Túnel de vento | — | |
| Moving ground plane | Solo móvel (esteira) | — | |
| Coastdown test | Teste de desaceleração livre | — | ⚑ "coastdown" |

## 10. Performance, testing and setup — Desempenho, testes e acerto

| English | Português (BR) | Símbolo | Notes / Observações |
|---|---|---|---|
| Setup | Acerto | — | ⚑ "setup" domina no paddock |
| Tuning | Regulagem / acerto | — | |
| g-g diagram | Diagrama g-g | — | Envelope de desempenho |
| Performance envelope | Envelope de desempenho | — | |
| Lap time | Tempo de volta | — | |
| Lap simulation | Simulação de volta | — | |
| Sensitivity | Sensibilidade | $\partial t/\partial m$ | Derivada de tempo de volta |
| Stint | Stint | — | ⚑ usa-se em inglês; "trecho de prova" |
| Out-lap | Volta de saída | — | ⚑ "out-lap" |
| Fuel load | Carga de combustível | — | |
| Telemetry | Telemetria | — | |
| Data acquisition | Aquisição de dados | — | ⚑ "data logging" |
| Overlay | Sobreposição (overlay) | — | ⚑ usa-se em inglês; caixa sobre a imagem do simulador |
| Shared memory | Memória compartilhada | — | Como o iRacing publica a telemetria ao vivo |
| Session file (.ibt) | Arquivo de sessão (.ibt) | — | Telemetria gravada, para análise pós-sessão |
| Channel | Canal | — | Uma grandeza registrada, ex. `LatAccel` |
| Sample rate | Taxa de amostragem | — | 60 Hz no iRacing |
| Handwheel angle | Ângulo do volante | — | Dividir pela relação de direção para chegar à roda |
| Parameter identification | Identificação de parâmetros | — | Extrair $K$, $C_lpha$ etc. dos dados |
| Moment Method | Método dos Momentos | — | Abrev. MMM / MRA; diagrama $N$ vs $A_y$ |
| Trim point | Ponto de equilíbrio | $N = 0$ | ⚑ "trim"; estado que o carro consegue manter |
| Trim line | Linha de equilíbrio | $N = 0$ | Todos os pontos de equilíbrio do diagrama MMM |
| Trimmed lateral acceleration | Aceleração lateral em equilíbrio | — | O que o carro sustenta, não o que ele gera |
| Constrained testing | Ensaio com vínculo | — | Carro impedido de fazer o que faria; medem-se as reações |
| Yaw acceleration | Aceleração de guinada | $\dot r = N/I_{zz}$ | Taxa com que o carro deixa o estado observado |
| Constant radius test | Ensaio de raio constante | — | |
| Step input | Entrada em degrau | — | |
| A-B-A testing | Ensaio A-B-A | — | Protocolo de comparação |
| Repeatability | Repetibilidade | — | |
| Driver in the loop | Piloto no laço (na malha) | — | ⚑ "driver in the loop" |
| Complaint | Reclamação (do piloto) | — | Ponto de partida do diagnóstico |
| Corner entry / mid / exit | Entrada / meio / saída de curva | — | |
| Trail braking | Trail braking | — | ⚑ usa-se em inglês; "frenagem prolongada" |
| Power-on oversteer | Sobre-esterço de aceleração | — | "Saída de traseira na aceleração" |
| Push / loose | Empurrando / solto | — | Gíria norte-americana para sub/sobre-esterço |

---

## Quick reference — the twenty that matter most
## Referência rápida — os vinte que mais importam

| English | Português (BR) |
|---|---|
| Slip angle | Ângulo de deriva |
| Cornering stiffness | Rigidez em curva |
| Load sensitivity | Sensibilidade à carga |
| Contact patch | Área de contato |
| Aligning torque | Torque autoalinhante |
| Pneumatic trail | Rastro pneumático |
| Understeer / oversteer | Subesterço / sobre-esterço |
| Understeer gradient | Gradiente de subesterço |
| Sideslip angle | Ângulo de deriva do veículo |
| Yaw rate | Velocidade de guinada |
| Load transfer | Transferência de carga |
| TLLTD | Distribuição da transferência lateral de carga |
| Roll centre | Centro de rolagem |
| Roll stiffness | Rigidez à rolagem |
| Anti-roll bar | Barra estabilizadora |
| Sprung / unsprung mass | Massa suspensa / não suspensa |
| Damping ratio | Fator de amortecimento |
| Natural frequency | Frequência natural |
| Downforce | Força descendente (downforce) |
| Setup | Acerto |

---

## False friends and traps — Falsos amigos e armadilhas

- **Slip angle vs sideslip angle.** Both become *ângulo de deriva* if you are
  careless. Keep them apart: *ângulo de deriva do pneu* ($\alpha$) and *ângulo
  de deriva do veículo* ($\beta$).
  Ambos viram "ângulo de deriva" se você não tomar cuidado. Separe: **do pneu**
  ($\alpha$) e **do veículo** ($\beta$).

- **Roll ≠ rolling.** *Roll* is **rolagem** (body roll about the longitudinal
  axis). *Rolling resistance* is **resistência ao rolamento** — a different
  phenomenon that happens to share a root.

- **Scrub radius vs roll centre.** "Raio de rolagem" is sometimes used for
  *scrub radius*, which collides with *centro de rolagem*. Prefer **raio de
  scrub** or **braço a terra**.

- **Rate vs ratio.** *Spring rate* is **constante/rigidez da mola** (N/m), not
  "taxa". *Installation ratio* is **razão de instalação** (dimensionless).

- **Damper "speed" is not the car's speed.** *Low/high-speed damping* refers to
  the **velocidade do amortecedor**, not the vehicle's.
  Refere-se à velocidade do **amortecedor**, não à do carro.

- **Compliance ≠ compliance (regulatory).** Here it means structural
  **complacência** — flexibility under load — never "conformidade".

- **Trail.** *Pneumatic/mechanical trail* is **rastro** (a distance). Do not
  confuse with *trail braking*, which is a driving technique and keeps its
  English name.

- **Bias.** *Brake bias* is **distribuição de frenagem**, not "viés".

---

*Terms follow the usage in the course notes in this folder. Where Brazilian
practice differs from a literal translation, the practical term is given first.*

*Os termos seguem o uso das notas de curso desta pasta. Onde a prática
brasileira difere da tradução literal, o termo usado na prática vem primeiro.*
