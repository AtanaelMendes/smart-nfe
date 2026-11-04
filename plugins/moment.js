import moment from 'moment';
import 'moment/locale/pt-br';

export default function momentSetup() {
    moment.locale('pt-BR');
    return moment;
}
