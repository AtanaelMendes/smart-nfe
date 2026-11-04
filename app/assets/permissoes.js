export const PERMISSOES = {
    hasPermisssion: (userPermissions, saasPermissions) => {
        
        if (typeof userPermissions === 'object') {
            const userLogadoPermissoes =  Object.values(userPermissions);
            return userLogadoPermissoes.some(valor => saasPermissions.includes(valor));
        }

        if (Array.isArray(userPermissions)) {
            return userPermissions.some(valor => saasPermissions.includes(valor));
        }

		return false;
    },
    selecao: {
        selecao: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.selecaoIDS);
        },
        selecaoEntrar: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.entrarIDS);
        },
        selecaoGerencial: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.gerencialIDS);
        },
        selecaoRequisicoes: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.requisicaoIDS);
        },
        selecaoAberturaRequisicao: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.aberturaRequisicaoIDS);
        },
        selecaoFaturamentoAvaliacao: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.faturamentoAvaliacaoIDS);
        },
        testes: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.testesIDS);
        },
        processos: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosIDS);
        },
        processosCadastros: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosCadastrosIDS);
        },
        processosCadastrosReprovacao: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosCadastrosReprovacaoIDS);
        },
        processosCadastrosDesistencia: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosCadastrosDesistenciaIDS);
        },
        processosCadastrosAreas: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosCadastrosAreasIDS);
        },
        processosCadastrosTurnos: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosCadastrosTurnosIDS);
        },
        processosNidecEmbraco: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosNidecEmbracoIDS);
        },
        processosCarbuss: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosCarbussIDS);
        },
        processosPortoBello: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosPortoBelloIDS);
        },
        processosGoodyearSumare: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosGoodyearSumareIDS);
        },
        processosHondaSumare: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosHondaSumareIDS);
        },
        processosGM: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosGMIDS);
        },
        processosBMW: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosBMWIDS);
        },
        processosWhirlpoolJoinville: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosWhirlpoolJoinvilleIDS);
        },
        processosWhirlpoolRioClaro: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosWhirlpoolRioClaroIDS);
        },
        processosRelatorioTurnosAdmitidosWhirlpool: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosRelatorioTurnosAdmitidosWhirlpoolIDS);
        },
        processosRelatorioWetzel: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosRelatorioWetzelIDS);
        },
        processosRelatorios: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.processosRelatoriosIDS);
        },
        gerencialVagasAbertas: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.gerencialVagasAbertasIDS);
        },
        premiacaoRS: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.selecao.premiacaoRSIDS);
        },
    
        selecaoIDS: [58, 59, 60, 90, 91, 92, 93, 94, 104, 105, 132, 106],
        entrarIDS: [58, 59, 60],
        gerencialIDS: [59],
        requisicaoIDS: [59, 58, 60],
        aberturaRequisicaoIDS: [59, 58, 60],
        faturamentoAvaliacaoIDS: [59, 58, 60],
        testesIDS: [206],
        processosIDS: [90, 91, 92, 93, 94, 104, 105, 132, 106, 289, 290, 302, 308],
        processosCadastrosIDS: [90, 91, 92, 302],
        processosCadastrosReprovacaoIDS: [90],
        processosCadastrosDesistenciaIDS: [91],
        processosCadastrosAreasIDS: [92],
        processosCadastrosTurnosIDS: [302],
        processosNidecEmbracoIDS: [93],
        processosCarbussIDS: [93],
        processosPortoBelloIDS: [93],
        processosGoodyearSumareIDS: [289],
        processosHondaSumareIDS: [290],
        processosGMIDS: [104],
        processosBMWIDS: [308],
        processosWhirlpoolJoinvilleIDS: [105],
        processosWhirlpoolRioClaroIDS: [132],
        processosRelatorioTurnosAdmitidosWhirlpoolIDS: [106],
        processosRelatorioWetzelIDS: [106],
        processosRelatoriosIDS: [94],
        gerencialVagasAbertasIDS: [100],
        premiacaoRSIDS: [304],
    },
    ramais: {
        ramais: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.ramais.ramaisIDS);
        },
        ramaisIDS: [25]
    },
    dayone: {
        dayone: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.dayone.dayoneIDS);
        },
        dayoneIDS: [334]
    },
    chatBot: {
        dashboard: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.chatBot.chatBotIDS);
        },
        chatBotIDS: [335]
    },
    financeiro: {
        financeiro: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.financeiro.financeiroIDS);
        },
        BotValidaCliente: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.financeiro.BotValidaClienteIDS);
        },
        financeiroIDS: [107],
        BotValidaClienteIDS: [341]
    },
    recrutamento: {
        callcenter: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.recrutamento.callCenterIDS);
        },
        Recrutamento: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.recrutamento.recrutamentoIDS);
        },
        Autoatendimento: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.recrutamento.recrutamentoAutoatendimentoIDS);
        },
        RecrutamentoEntrar: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.recrutamento.entrarIDS);
        },
        callCenterIDS: [316],
        recrutamentoIDS: [36],
        recrutamentoAutoatendimentoIDS: [103],
        entrarIDS: [36, 37],
    },
    marketing: {
        CampanhasEndomarketing: (userPermissions) => {
            return PERMISSOES.hasPermisssion(userPermissions, PERMISSOES.marketing.campanhas);
        },
        campanhas: [338],
    },
}