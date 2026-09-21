-- Semeia os 7 tipos de risco da Fase 1 (foco fisioterapia) para cada
-- empresa já existente no fisio. Campos/faixas/medidas são parametrizáveis
-- depois pela tela Tipos de Risco — isso aqui é só o ponto de partida.

do $$
declare
  empresa record;
begin
  for empresa in select id from companies loop

    insert into risk_types (company_id, code, name, description, campos, faixas, medidas_preventivas)
    values (
      empresa.id, 'queda', 'Risco de Queda',
      'Escala de Morse simplificada, adaptada ao contexto fisioterapêutico.',
      '[
        {"chave":"historico_quedas","label":"Histórico de quedas recente","tipo":"sim_nao","peso":25},
        {"chave":"diagnostico_secundario","label":"Diagnóstico secundário","tipo":"sim_nao","peso":15},
        {"chave":"deambulacao","label":"Auxílio para deambulação",
          "tipo":"escala","peso":1,
          "opcoes":[{"valor":0,"label":"Nenhum/repouso/cadeira de rodas"},{"valor":15,"label":"Muletas/bengala/andador"},{"valor":30,"label":"Apoia-se em móveis"}]},
        {"chave":"marcha","label":"Marcha",
          "tipo":"escala","peso":1,
          "opcoes":[{"valor":0,"label":"Normal/repouso"},{"valor":10,"label":"Fraca"},{"valor":20,"label":"Comprometida"}]},
        {"chave":"estado_mental","label":"Estado mental",
          "tipo":"escala","peso":1,
          "opcoes":[{"valor":0,"label":"Orientado quanto à própria capacidade"},{"valor":15,"label":"Superestima capacidade/esquece limitações"}]}
      ]'::jsonb,
      '[{"nivel":"baixo","min":0,"max":24},{"nivel":"moderado","min":25,"max":44},{"nivel":"alto","min":45,"max":200},{"nivel":"muito_alto","min":201,"max":999}]'::jsonb,
      '{"baixo":["Orientação geral de segurança"],"moderado":["Grades elevadas","Sinalização de risco de queda"],"alto":["Grades elevadas","Sinalização no leito e prontuário","Acompanhamento em toda mobilização"],"muito_alto":["Vigilância contínua durante a mobilização","Reavaliação diária"]}'::jsonb
    );

    insert into risk_types (company_id, code, name, description, campos, faixas, medidas_preventivas)
    values (
      empresa.id, 'lesao_pressao', 'Risco de Lesão por Pressão',
      'Fatores de risco relevantes à mobilização e ao posicionamento pela fisioterapia.',
      '[
        {"chave":"mobilidade_reduzida","label":"Mobilidade reduzida no leito","tipo":"sim_nao","peso":10},
        {"chave":"tempo_internacao","label":"Internação prolongada (>7 dias)","tipo":"sim_nao","peso":5},
        {"chave":"sensibilidade_alterada","label":"Sensibilidade/percepção alterada","tipo":"sim_nao","peso":10},
        {"chave":"umidade","label":"Exposição à umidade (incontinência, sudorese)","tipo":"sim_nao","peso":5}
      ]'::jsonb,
      '[{"nivel":"baixo","min":0,"max":9},{"nivel":"moderado","min":10,"max":19},{"nivel":"alto","min":20,"max":29},{"nivel":"muito_alto","min":30,"max":999}]'::jsonb,
      '{"baixo":["Mudança de decúbito a cada 2-4h"],"moderado":["Mudança de decúbito a cada 2h","Mobilização precoce assistida"],"alto":["Mudança de decúbito a cada 2h com registro","Coxins de posicionamento","Mobilização precoce diária"],"muito_alto":["Superfície de suporte especial","Mobilização assistida intensiva","Avaliação conjunta com enfermagem"]}'::jsonb
    );

    insert into risk_types (company_id, code, name, description, campos, faixas, medidas_preventivas)
    values (
      empresa.id, 'broncoaspiracao', 'Risco de Broncoaspiração',
      'Fatores relevantes à fisioterapia respiratória e disfagia.',
      '[
        {"chave":"disfagia","label":"Disfagia identificada/suspeita","tipo":"sim_nao","peso":15},
        {"chave":"nivel_consciencia","label":"Nível de consciência rebaixado","tipo":"sim_nao","peso":15},
        {"chave":"via_alternativa","label":"Via alimentar alternativa (SNE/SNG)","tipo":"sim_nao","peso":10},
        {"chave":"tosse_ineficaz","label":"Tosse ineficaz","tipo":"sim_nao","peso":10}
      ]'::jsonb,
      '[{"nivel":"baixo","min":0,"max":9},{"nivel":"moderado","min":10,"max":19},{"nivel":"alto","min":20,"max":29},{"nivel":"muito_alto","min":30,"max":999}]'::jsonb,
      '{"baixo":["Orientação de posicionamento à alimentação"],"moderado":["Cabeceira elevada ≥30°","Fisioterapia respiratória de rotina"],"alto":["Cabeceira elevada ≥45°","Higiene brônquica assistida","Avaliação fonoaudiológica"],"muito_alto":["Aspiração assistida disponível","Monitorização respiratória contínua durante mobilização"]}'::jsonb
    );

    insert into risk_types (company_id, code, name, description, campos, faixas, medidas_preventivas)
    values (
      empresa.id, 'deterioracao_clinica', 'Risco de Deterioração Clínica',
      'Sinais de alerta observados durante o atendimento fisioterapêutico.',
      '[
        {"chave":"instabilidade_hemodinamica","label":"Instabilidade hemodinâmica recente","tipo":"sim_nao","peso":20},
        {"chave":"dessaturacao_esforço","label":"Dessaturação ao esforço/mobilização","tipo":"sim_nao","peso":15},
        {"chave":"uso_droga_vasoativa","label":"Uso de droga vasoativa","tipo":"sim_nao","peso":20}
      ]'::jsonb,
      '[{"nivel":"baixo","min":0,"max":9},{"nivel":"moderado","min":10,"max":19},{"nivel":"alto","min":20,"max":34},{"nivel":"muito_alto","min":35,"max":999}]'::jsonb,
      '{"baixo":["Monitorização de rotina durante o atendimento"],"moderado":["Monitorização de sinais vitais antes/depois da mobilização"],"alto":["Mobilização progressiva com monitorização contínua","Critérios de interrupção claros"],"muito_alto":["Avaliação médica antes de qualquer mobilização","Atendimento sempre acompanhado"]}'::jsonb
    );

    insert into risk_types (company_id, code, name, description, campos, faixas, medidas_preventivas)
    values (
      empresa.id, 'tromboembolismo', 'Risco de Tromboembolismo',
      'Fatores relevantes à mobilização precoce como medida preventiva.',
      '[
        {"chave":"imobilidade_prolongada","label":"Imobilidade prolongada (>72h)","tipo":"sim_nao","peso":15},
        {"chave":"cirurgia_recente","label":"Cirurgia recente (<30 dias)","tipo":"sim_nao","peso":15},
        {"chave":"historico_tev","label":"Histórico pessoal de TEV","tipo":"sim_nao","peso":20}
      ]'::jsonb,
      '[{"nivel":"baixo","min":0,"max":9},{"nivel":"moderado","min":10,"max":19},{"nivel":"alto","min":20,"max":34},{"nivel":"muito_alto","min":35,"max":999}]'::jsonb,
      '{"baixo":["Estímulo à mobilização ativa"],"moderado":["Mobilização precoce diária","Exercícios de bomba muscular de panturrilha"],"alto":["Mobilização precoce 2x/dia","Meias de compressão (se prescrito)"],"muito_alto":["Mobilização assistida intensiva","Comunicação ativa com equipe médica"]}'::jsonb
    );

    insert into risk_types (company_id, code, name, description, campos, faixas, medidas_preventivas)
    values (
      empresa.id, 'dispositivos', 'Risco Relacionado a Dispositivos',
      'Risco de deslocamento/perda de dispositivos durante a mobilização fisioterapêutica.',
      '[
        {"chave":"quantidade_dispositivos","label":"Número de dispositivos invasivos",
          "tipo":"escala","peso":1,
          "opcoes":[{"valor":0,"label":"Nenhum"},{"valor":10,"label":"1 a 2"},{"valor":20,"label":"3 ou mais"}]},
        {"chave":"agitacao","label":"Agitação/confusão mental","tipo":"sim_nao","peso":15}
      ]'::jsonb,
      '[{"nivel":"baixo","min":0,"max":9},{"nivel":"moderado","min":10,"max":19},{"nivel":"alto","min":20,"max":29},{"nivel":"muito_alto","min":30,"max":999}]'::jsonb,
      '{"baixo":["Checagem de rotina antes/depois da mobilização"],"moderado":["Fixação reforçada antes de mobilizar"],"alto":["Mobilização sempre acompanhada por 2 profissionais","Checagem de todos os dispositivos antes/depois"],"muito_alto":["Avaliação conjunta com enfermagem antes de mobilizar","Contenção/orientação familiar quando indicado"]}'::jsonb
    );

    insert into risk_types (company_id, code, name, description, campos, faixas, medidas_preventivas)
    values (
      empresa.id, 'delirium', 'Risco de Delirium',
      'Fatores de risco observáveis durante o atendimento — não substitui escala validada de enfermagem/medicina.',
      '[
        {"chave":"idade_avancada","label":"Idade ≥ 65 anos","tipo":"sim_nao","peso":10},
        {"chave":"privação_sono","label":"Privação de sono / ciclo dia-noite alterado","tipo":"sim_nao","peso":10},
        {"chave":"confusao_flutuante","label":"Confusão mental flutuante observada","tipo":"sim_nao","peso":20},
        {"chave":"uso_sedativos","label":"Uso de sedativos/opioides","tipo":"sim_nao","peso":10}
      ]'::jsonb,
      '[{"nivel":"baixo","min":0,"max":9},{"nivel":"moderado","min":10,"max":19},{"nivel":"alto","min":20,"max":29},{"nivel":"muito_alto","min":30,"max":999}]'::jsonb,
      '{"baixo":["Estímulo à orientação temporal durante o atendimento"],"moderado":["Mobilização precoce","Estímulo cognitivo leve durante o atendimento"],"alto":["Mobilização precoce diária","Reorientação frequente","Comunicação com equipe sobre sinais observados"],"muito_alto":["Avaliação médica/enfermagem prioritária","Atendimento em horário de menor sedação, se possível"]}'::jsonb
    );

  end loop;
end $$;
