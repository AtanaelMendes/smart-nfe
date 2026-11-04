'use client';

import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import Button from '@/components/buttons/Button';
import ButtonToggle from '@/components/buttons/ButtonToggle';
import ButtonDropDown from '@/components/buttons/ButtonDropDown';
import ButtonGroup from '@/components/buttons/ButtonGroup';
import ButtonRadioGroup from '@/components/buttons/ButtonRadioGroup';
import FloatActionButton from '@/components/buttons/FloatActionButton';
import FloatActionButtonExpandable from '@/components/buttons/FloatActionButtonExpandable';
import PillsBadge from '@/components/buttons/PillsBadge';
import WhatsappButton from '@/components/buttons/WhatsappButton';
import InputText from '@/components/inputs/InputText';
import InputEmail from '@/components/inputs/InputEmail';
import InputPassword from '@/components/inputs/InputPassword';
import InputNumber from '@/components/inputs/InputNumber';
import InputDate from '@/components/inputs/InputDate';
import DatePicker from '@/components/inputs/DatePicker';
import InputMonth from '@/components/inputs/InputMonth';
import Checkbox from '@/components/inputs/Checkbox';
import Radio from '@/components/inputs/Radio';
import InputFile from '@/components/inputs/InputFile';
import InputTextArea from '@/components/inputs/InputTextArea';
import InputCPF from '@/components/inputs/InputCPF';
import InputPIS from '@/components/inputs/InputPIS';
import InputNIT from '@/components/inputs/InputNIT';
import Card from '@/components/cards/Card';
import { CardTitle, CardActions, CardImage, CardBody } from '@/components/cards/Card';
import Accordion from '@/components/Layouts/Accordion';
import Loading from '@/components/Layouts/Loading';
import NoDataFound from '@/components/Layouts/NoDataFound';
import { Pagination } from '@/components/Layouts/Pagination';
import { Skeleton, FormSkeleton, SkeletonList } from '@/components/Layouts/Skeleton';
import { TooltipComponent } from '@/components/Layouts/TooltipComponent';
import { Title, Subtitle, Label, Caption, FieldLabel } from '@/components/Layouts/Typography';
import ModalGrid from '@/components/Layouts/ModalGrid';
import Balloon from '@/components/Layouts/Balloon';
import Blockquote from '@/components/Layouts/Blockquote';
import Clipboard from '@/components/Layouts/Clipboard';
import Confirm from '@/components/Layouts/Confirm';
import Dialog from '@/components/Layouts/Dialog';
import DialogFields from '@/components/Layouts/DialogFields';
import DataLoading from '@/components/Layouts/DataLoading';
import Failure from '@/components/Layouts/Failure';
import Iframe from '@/components/Layouts/Iframe';
import MiniSidebar from '@/components/Layouts/MiniSidebar';
import { faHome, faUser, faCog, faChartBar } from '@fortawesome/free-solid-svg-icons';

const CodeBlock = ({ code }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative mt-4">
            <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors flex items-center gap-2"
            >
                {copied ? (
                    <>
                        <span>✓</span>
                        <span>Copiado!</span>
                    </>
                ) : (
                    <>
                        <span>📋</span>
                        <span>Copiar</span>
                    </>
                )}
            </button>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto border border-gray-700">
                <code>{code}</code>
            </pre>
        </div>
    );
};

const Section = ({ title, children }) => (
    <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b-2 border-primary">
            {title}
        </h2>
        {children}
    </div>
);

const ComponentDemo = ({ title, description, code, children, id }) => (
    <div id={id} className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 scroll-mt-24">
        <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-4">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {description && <p className="text-blue-100 text-sm mt-1">{description}</p>}
        </div>
        <div className="p-6">
            <div className="mb-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 min-h-[100px] flex items-center justify-center">
                <div className="w-full">
                    {children}
                </div>
            </div>
            {code && <CodeBlock code={code} />}
        </div>
    </div>
);

export default function DevPage() {
    const { darkMode, toggleDarkMode } = useAppContext();
    const [activeSection, setActiveSection] = useState('buttons');
    const [inputValue, setInputValue] = useState('');
    const [emailValue, setEmailValue] = useState('');
    const [passwordValue, setPasswordValue] = useState('');
    const [numberValue, setNumberValue] = useState('');
    const [dateValue, setDateValue] = useState('');
    const [monthValue, setMonthValue] = useState('');
    const [cpfValue, setCpfValue] = useState('');
    const [pisValue, setPisValue] = useState('');
    const [nitValue, setNitValue] = useState('');
    const [checkboxValue, setCheckboxValue] = useState(false);
    const [radioValue, setRadioValue] = useState('');
    const [textAreaValue, setTextAreaValue] = useState('');
    const [toggleValue, setToggleValue] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState('option1');
    const [loading, setLoading] = useState(false);
    const [paginationData] = useState(Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` })));
    const [showModal, setShowModal] = useState(false);
    const [showModalDanger, setShowModalDanger] = useState(false);
    const [showModalWarning, setShowModalWarning] = useState(false);
    const [showBalloon, setShowBalloon] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [showDialogFields, setShowDialogFields] = useState(false);
    const [showFailure, setShowFailure] = useState(false);
    const [sidebarActive, setSidebarActive] = useState('home');
    const [expandedSections, setExpandedSections] = useState(['buttons', 'inputs', 'cards', 'layouts']);

    const menuItems = [
        { 
            id: 'buttons', 
            label: 'Botões', 
            icon: '🔘',
            items: [
                { id: 'button-variants', label: 'Variantes de Cores' },
                { id: 'button-sizes', label: 'Tamanhos' },
                { id: 'button-shapes', label: 'Formas' },
                { id: 'button-states', label: 'Estados' },
                { id: 'button-dropdown', label: 'Dropdown' },
                { id: 'button-toggle', label: 'Toggle' },
                { id: 'button-group', label: 'Button Group' },
                { id: 'button-radio', label: 'Radio Group' },
                { id: 'button-float', label: 'Float Action' },
                { id: 'button-float-expandable', label: 'Float Expandable' },
                { id: 'button-pills', label: 'Pills Badge' },
                { id: 'button-whatsapp', label: 'WhatsApp' },
            ]
        },
        { 
            id: 'inputs', 
            label: 'Inputs', 
            icon: '📝',
            items: [
                { id: 'input-text', label: 'Text' },
                { id: 'input-email', label: 'Email' },
                { id: 'input-password', label: 'Password' },
                { id: 'input-number', label: 'Number' },
                { id: 'input-date', label: 'Date' },
                { id: 'input-datepicker', label: 'DatePicker' },
                { id: 'input-month', label: 'Month' },
                { id: 'input-cpf', label: 'CPF' },
                { id: 'input-pis', label: 'PIS' },
                { id: 'input-nit', label: 'NIT' },
                { id: 'input-checkbox', label: 'Checkbox' },
                { id: 'input-radio', label: 'Radio' },
                { id: 'input-file', label: 'File' },
                { id: 'input-textarea', label: 'TextArea' },
            ]
        },
        { 
            id: 'cards', 
            label: 'Cards', 
            icon: '🎴',
            items: [
                { id: 'card-basic', label: 'Card Básico' },
                { id: 'card-colors', label: 'Com Cores' },
                { id: 'card-image', label: 'Com Imagem' },
            ]
        },
        { 
            id: 'layouts', 
            label: 'Layouts', 
            icon: '📐',
            items: [
                { id: 'layout-typography', label: 'Typography' },
                { id: 'layout-accordion', label: 'Accordion' },
                { id: 'layout-loading', label: 'Loading' },
                { id: 'layout-nodata', label: 'NoDataFound' },
                { id: 'layout-pagination', label: 'Pagination' },
                { id: 'layout-skeleton', label: 'Skeleton' },
                { id: 'layout-skeleton-form', label: 'FormSkeleton' },
                { id: 'layout-skeleton-table', label: 'TableSkeleton' },
                { id: 'layout-skeleton-card', label: 'CardSkeleton' },
                { id: 'layout-skeleton-list', label: 'ListSkeleton' },
                { id: 'layout-tooltip', label: 'Tooltip' },
                { id: 'layout-modal', label: 'ModalGrid' },
                { id: 'layout-modal-variants', label: 'Modal Variantes' },
                { id: 'layout-modal-sizes', label: 'Modal Tamanhos' },
                { id: 'layout-modal-props', label: 'Modal Propriedades' },
                { id: 'layout-balloon', label: 'Balloon' },
                { id: 'layout-blockquote', label: 'Blockquote' },
                { id: 'layout-clipboard', label: 'Clipboard' },
                { id: 'layout-confirm', label: 'Confirm' },
                { id: 'layout-dialog', label: 'Dialog' },
                { id: 'layout-dialogfields', label: 'DialogFields' },
                { id: 'layout-dataloading', label: 'DataLoading' },
                { id: 'layout-failure', label: 'Failure' },
                { id: 'layout-iframe', label: 'Iframe' },
                { id: 'layout-minisidebar', label: 'MiniSidebar' },
            ]
        },
    ];

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => 
            prev.includes(sectionId) 
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const scrollToComponent = (componentId) => {
        const element = document.getElementById(componentId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Sidebar */}
                <aside className="w-64 bg-white dark:bg-gray-800 shadow-xl fixed h-full overflow-y-auto border-r border-gray-200 dark:border-gray-700">
                    <div className="p-6 bg-gradient-to-br from-primary to-blue-700">
                        <h1 className="text-2xl font-bold text-white">Component Docs</h1>
                        <p className="text-blue-100 text-sm mt-1">template_next</p>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => {
                                console.log('🔘 Button clicked! Current darkMode:', darkMode);
                                toggleDarkMode();
                                console.log('🔘 toggleDarkMode called');
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <span className="flex items-center gap-3">
                                <span className="text-xl">{darkMode ? '🌙' : '☀️'}</span>
                                <span className="font-medium text-gray-700 dark:text-gray-200">
                                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                                </span>
                            </span>
                            <div className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-gray-300'} relative`}>
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </button>
                    </div>

                    <nav className="p-4">
                        <div className="mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Componentes
                        </div>
                        {menuItems.map((section) => (
                            <div key={section.id} className="mb-2">
                                {/* Section Header */}
                                <button
                                    onClick={() => {
                                        setActiveSection(section.id);
                                        toggleSection(section.id);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-between ${
                                        activeSection === section.id
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{section.icon}</span>
                                        <span className="font-medium">{section.label}</span>
                                    </div>
                                    <svg
                                        className={`w-4 h-4 transition-transform duration-200 ${
                                            expandedSections.includes(section.id) ? 'rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Section Items (Tree) */}
                                {expandedSections.includes(section.id) && (
                                    <div className="ml-4 mt-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                                        {section.items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setActiveSection(section.id);
                                                    scrollToComponent(item.id);
                                                }}
                                                className="w-full text-left px-3 py-1.5 rounded text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-2"
                                            >
                                                <span className="text-gray-400">→</span>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                </nav>

                    <div className="p-4 mt-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Template Next v1.0</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Next.js 16 + React 19</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Tailwind CSS v4</p>
                    </div>
                </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Buttons Section */}
                    {activeSection === 'buttons' && (
                        <>
                            <Section title="🔘 Botões">
                                <ComponentDemo
                                    id="button-variants"
                                    title="Button - Variantes de Cores"
                                    description="Botões com diferentes estilos visuais para ações primárias, secundárias, sucesso, perigo e aviso."
                                    code={`<Button buttonType="primary">Primary</Button>
<Button buttonType="secondary">Secondary</Button>
<Button buttonType="success">Success</Button>
<Button buttonType="danger">Danger</Button>
<Button buttonType="warning">Warning</Button>
<Button buttonType="ghost">Ghost</Button>`}
                                >
                                    <div className="flex flex-wrap gap-3">
                                        <Button buttonType="primary">Primary</Button>
                                        <Button buttonType="secondary">Secondary</Button>
                                        <Button buttonType="success">Success</Button>
                                        <Button buttonType="danger">Danger</Button>
                                        <Button buttonType="warning">Warning</Button>
                                        <Button buttonType="ghost">Ghost</Button>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    title="Button - Estilos Outline"
                                    description="Versão outline dos botões, com borda colorida e fundo transparente."
                                    code={`<Button buttonType="primary" outline>Primary Outline</Button>
<Button buttonType="success" outline>Success Outline</Button>
<Button buttonType="danger" outline>Danger Outline</Button>`}
                                >
                                    <div className="flex flex-wrap gap-3">
                                        <Button buttonType="primary" outline>Primary Outline</Button>
                                        <Button buttonType="secondary" outline>Secondary Outline</Button>
                                        <Button buttonType="success" outline>Success Outline</Button>
                                        <Button buttonType="danger" outline>Danger Outline</Button>
                                        <Button buttonType="warning" outline>Warning Outline</Button>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-sizes"
                                    title="Button - Tamanhos"
                                    description="Botões em diferentes tamanhos: pequeno, padrão e largo."
                                    code={`<Button buttonType="primary" size="small">Small</Button>
<Button buttonType="primary">Default</Button>
<Button buttonType="primary" block>Block (Full Width)</Button>`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <Button buttonType="primary" size="small">Small</Button>
                                            <Button buttonType="primary">Default</Button>
                                        </div>
                                        <Button buttonType="primary" block>Block (Full Width)</Button>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-shapes"
                                    title="Button - Formas"
                                    description="Botões com diferentes formatos: padrão, pill (arredondado) e square (sem borda arredondada)."
                                    code={`<Button buttonType="primary">Default Rounded</Button>
<Button buttonType="primary" pill>Pill Shape</Button>
<Button buttonType="primary" square>Square</Button>`}
                                >
                                    <div className="flex flex-wrap gap-3">
                                        <Button buttonType="primary">Default Rounded</Button>
                                        <Button buttonType="primary" pill>Pill Shape</Button>
                                        <Button buttonType="primary" square>Square</Button>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-states"
                                    title="Button - Estados"
                                    description="Botões em estados desabilitado e com bordas."
                                    code={`<Button buttonType="primary" disabled>Disabled</Button>
<Button buttonType="primary" bordered>With Border</Button>
<Button buttonType="primary" outline bordered>Outline + Border</Button>`}
                                >
                                    <div className="flex flex-wrap gap-3">
                                        <Button buttonType="primary" disabled>Disabled</Button>
                                        <Button buttonType="secondary" disabled>Disabled</Button>
                                        <Button buttonType="primary" bordered>With Border</Button>
                                        <Button buttonType="primary" outline bordered>Outline + Border</Button>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-toggle"
                                    title="ButtonToggle"
                                    description="Botão com estado on/off, ideal para configurações e preferências."
                                    code={`const [toggleValue, setToggleValue] = useState(false);

<ButtonToggle 
  value={toggleValue}
  onChange={setToggleValue}
>
  {toggleValue ? 'Ativado' : 'Desativado'}
</ButtonToggle>`}
                                >
                                    <div className="flex gap-3 items-center">
                                        <ButtonToggle
                                            value={toggleValue}
                                            onChange={setToggleValue}
                                        >
                                            {toggleValue ? 'Ativado ✓' : 'Desativado ✗'}
                                        </ButtonToggle>
                                        <span className="text-sm text-gray-600">
                                            Estado atual: <strong className={toggleValue ? 'text-green-600' : 'text-red-600'}>
                                                {toggleValue ? 'ON' : 'OFF'}
                                            </strong>
                                        </span>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-dropdown"
                                    title="ButtonDropDown"
                                    description="Botão com menu dropdown para múltiplas opções."
                                    code={`<ButtonDropDown 
  label="Exportar Documento"
  type="primary"
  items={[
    { label: 'Exportar PDF', action: () => alert('PDF') },
    { label: 'Exportar Excel', action: () => alert('Excel') },
    { label: 'Exportar CSV', action: () => alert('CSV') },
    { label: 'Imprimir', action: () => alert('Imprimir') }
  ]}
/>`}
                                >
                                    <ButtonDropDown
                                        label="Exportar Documento"
                                        type="primary"
                                        items={[
                                            { label: 'Exportar PDF', action: () => alert('Exportar PDF') },
                                            { label: 'Exportar Excel', action: () => alert('Exportar Excel') },
                                            { label: 'Exportar CSV', action: () => alert('Exportar CSV') },
                                            { label: 'Imprimir', action: () => alert('Imprimir') }
                                        ]}
                                    />
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-group"
                                    title="ButtonGroup"
                                    description="Grupo de botões relacionados visualmente conectados."
                                    code={`<ButtonGroup
  options={[
    { label: 'Opção 1', value: 'option1' },
    { label: 'Opção 2', value: 'option2' },
    { label: 'Opção 3', value: 'option3' }
  ]}
  value={selected}
  onChange={setSelected}
/>`}
                                >
                                    <div className="space-y-3">
                                        <ButtonGroup
                                            options={[
                                                { label: 'Lista', value: 'list' },
                                                { label: 'Grade', value: 'grid' },
                                                { label: 'Tabela', value: 'table' }
                                            ]}
                                            value={selectedGroup}
                                            onChange={setSelectedGroup}
                                        />
                                        <p className="text-sm text-gray-600">Selecionado: <strong>{selectedGroup}</strong></p>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-radio"
                                    title="ButtonRadioGroup"
                                    description="Grupo de botões com comportamento de radio buttons."
                                    code={`<ButtonRadioGroup
  options={[
    { label: 'Diário', value: 'daily' },
    { label: 'Semanal', value: 'weekly' },
    { label: 'Mensal', value: 'monthly' }
  ]}
  value={selected}
  onChange={setSelected}
/>`}
                                >
                                    <div className="space-y-3">
                                        <ButtonRadioGroup
                                            options={[
                                                { label: 'Hoje', value: 'today' },
                                                { label: 'Esta Semana', value: 'week' },
                                                { label: 'Este Mês', value: 'month' },
                                                { label: 'Este Ano', value: 'year' }
                                            ]}
                                            value={radioValue}
                                            onChange={setRadioValue}
                                        />
                                        <p className="text-sm text-gray-600">Período: <strong>{radioValue || 'Nenhum'}</strong></p>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-float"
                                    title="FloatActionButton (FAB)"
                                    description="Botão flutuante para ação principal, geralmente fixo no canto da tela."
                                    code={`<FloatActionButton 
  onClick={() => alert('Adicionar novo item')}
  icon={<span>+</span>}
  position="bottom-right"
/>`}
                                >
                                    <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4">
                                        <p className="text-sm text-gray-700 mb-4 font-medium">Exemplo de FAB em posição bottom-right:</p>
                                        <FloatActionButton
                                            onClick={() => alert('Clicou no FAB!')}
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-float"
                                    title="FloatActionButtonExpandable"
                                    description="Botão flutuante que expande para mostrar múltiplas ações."
                                    code={`<FloatActionButtonExpandable
  actions={[
    { label: 'Editar', onClick: () => {} },
    { label: 'Compartilhar', onClick: () => {} },
    { label: 'Deletar', onClick: () => {} }
  ]}
/>`}
                                >
                                    <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4">
                                        <p className="text-sm text-gray-700 mb-4 font-medium">Clique no botão + para expandir as opções:</p>
                                        <FloatActionButtonExpandable
                                            actions={[
                                                { label: 'Novo Documento', onClick: () => alert('Novo documento') },
                                                { label: 'Nova Pasta', onClick: () => alert('Nova pasta') },
                                                { label: 'Upload', onClick: () => alert('Upload') }
                                            ]}
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-pills"
                                    title="PillsBadge"
                                    description="Badges em formato de pílula para tags e status."
                                    code={`<PillsBadge type="primary">Primary</PillsBadge>
<PillsBadge type="success">Success</PillsBadge>
<PillsBadge type="danger">Danger</PillsBadge>
<PillsBadge type="warning">Warning</PillsBadge>
<PillsBadge type="default" small>Small</PillsBadge>`}
                                >
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-3 items-center">
                                            <PillsBadge type="primary">Primary</PillsBadge>
                                            <PillsBadge type="primary-dark">Primary Dark</PillsBadge>
                                            <PillsBadge type="success">Success</PillsBadge>
                                            <PillsBadge type="danger">Danger</PillsBadge>
                                            <PillsBadge type="warning">Warning</PillsBadge>
                                            <PillsBadge type="warning-dark">Warning Dark</PillsBadge>
                                            <PillsBadge type="default">Default</PillsBadge>
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-sm text-gray-600 mr-2">Tamanho pequeno:</span>
                                            <PillsBadge type="primary" small>Small Badge</PillsBadge>
                                            <PillsBadge type="success" small>Active</PillsBadge>
                                            <PillsBadge type="danger" small>Error</PillsBadge>
                                        </div>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="button-whatsapp"
                                    title="WhatsappButton"
                                    description="Botão estilizado para abrir conversa no WhatsApp."
                                    code={`<WhatsappButton 
  phoneNumber="5511999999999"
  message="Olá, gostaria de mais informações"
/>`}
                                >
                                    <div className="space-y-3">
                                        <WhatsappButton
                                            phoneNumber="5511999999999"
                                            message="Olá! Vim pela documentação do sistema."
                                        >
                                            Falar no WhatsApp
                                        </WhatsappButton>
                                        <p className="text-xs text-gray-500">Abre uma conversa no WhatsApp com mensagem pré-definida</p>
                                    </div>
                                </ComponentDemo>
                            </Section>
                        </>
                    )}

                    {/* Inputs Section */}
                    {activeSection === 'inputs' && (
                        <>
                            <Section title="📝 Inputs">
                                <ComponentDemo
                                    id="input-text"
                                    title="InputText"
                                    description="Input de texto básico com validação e estados."
                                    code={`<InputText
  label="Nome"
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
  placeholder="Digite seu nome"
  helperText="Campo obrigatório"
  required
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputText
                                            label="Nome Completo"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="Digite seu nome"
                                            helperText="Campo obrigatório"
                                            required
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-email"
                                    title="InputEmail"
                                    description="Input específico para endereço de e-mail com validação."
                                    code={`<InputEmail
  label="Email"
  value={emailValue}
  onChange={(e) => setEmailValue(e.target.value)}
  placeholder="seu@email.com"
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputEmail
                                            label="Endereço de Email"
                                            value={emailValue}
                                            onChange={(e) => setEmailValue(e.target.value)}
                                            placeholder="seu@email.com"
                                            required
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-password"
                                    title="InputPassword"
                                    description="Input de senha com botão para mostrar/ocultar."
                                    code={`<InputPassword
  label="Senha"
  value={passwordValue}
  onChange={(e) => setPasswordValue(e.target.value)}
  placeholder="Digite sua senha"
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputPassword
                                            label="Senha"
                                            value={passwordValue}
                                            onChange={(e) => setPasswordValue(e.target.value)}
                                            placeholder="Digite sua senha"
                                            required
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-number"
                                    title="InputNumber"
                                    description="Input numérico com incremento/decremento."
                                    code={`<InputNumber
  label="Quantidade"
  value={numberValue}
  onChange={(e) => setNumberValue(e.target.value)}
  min={0}
  max={100}
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputNumber
                                            label="Quantidade"
                                            value={numberValue}
                                            onChange={(e) => setNumberValue(e.target.value)}
                                            min={0}
                                            max={100}
                                            placeholder="0"
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-cpf"
                                    title="InputCPF"
                                    description="Input formatado para CPF com máscara."
                                    code={`<InputCPF
  label="CPF"
  value={cpfValue}
  onChange={(e) => setCpfValue(e.target.value)}
  placeholder="000.000.000-00"
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputCPF
                                            label="CPF"
                                            value={cpfValue}
                                            onChange={(e) => setCpfValue(e.target.value)}
                                            placeholder="000.000.000-00"
                                            required
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-pis"
                                    title="InputPIS"
                                    description="Input formatado para número PIS."
                                    code={`<InputPIS
  label="PIS"
  value={pisValue}
  onChange={(e) => setPisValue(e.target.value)}
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputPIS
                                            label="Número PIS"
                                            value={pisValue}
                                            onChange={(e) => setPisValue(e.target.value)}
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-nit"
                                    title="InputNIT"
                                    description="Input formatado para número NIT."
                                    code={`<InputNIT
  label="NIT"
  value={nitValue}
  onChange={(e) => setNitValue(e.target.value)}
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputNIT
                                            label="Número NIT"
                                            value={nitValue}
                                            onChange={(e) => setNitValue(e.target.value)}
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-date"
                                    title="InputDate"
                                    description="Input de data nativo."
                                    code={`<InputDate
  label="Data de Nascimento"
  value={dateValue}
  onChange={(e) => setDateValue(e.target.value)}
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputDate
                                            label="Data de Nascimento"
                                            value={dateValue}
                                            onChange={(e) => setDateValue(e.target.value)}
                                            required
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-datepicker"
                                    title="DatePicker"
                                    description="Seletor de data customizado com calendário."
                                    code={`<DatePicker
  label="Selecione uma Data"
  value={dateValue}
  onChange={setDateValue}
/>`}
                                >
                                    <div className="max-w-md">
                                        <DatePicker
                                            label="Selecione uma Data"
                                            value={dateValue}
                                            onChange={setDateValue}
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-month"
                                    title="InputMonth"
                                    description="Input para seleção de mês e ano."
                                    code={`<InputMonth
  label="Mês/Ano"
  value={monthValue}
  onChange={(e) => setMonthValue(e.target.value)}
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputMonth
                                            label="Período"
                                            value={monthValue}
                                            onChange={(e) => setMonthValue(e.target.value)}
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-textarea"
                                    title="InputTextArea"
                                    description="Área de texto para conteúdo maior."
                                    code={`<InputTextArea
  label="Observações"
  value={textAreaValue}
  onChange={(e) => setTextAreaValue(e.target.value)}
  rows={4}
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputTextArea
                                            label="Observações"
                                            value={textAreaValue}
                                            onChange={(e) => setTextAreaValue(e.target.value)}
                                            rows={4}
                                            placeholder="Digite suas observações aqui..."
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-checkbox"
                                    title="Checkbox"
                                    description="Caixa de seleção para opções múltiplas."
                                    code={`<Checkbox
  label="Aceito os termos"
  checked={checkboxValue}
  onChange={(e) => setCheckboxValue(e.target.checked)}
/>`}
                                >
                                    <div className="space-y-3">
                                        <Checkbox
                                            label="Aceito os termos e condições"
                                            checked={checkboxValue}
                                            onChange={(e) => setCheckboxValue(e.target.checked)}
                                        />
                                        <Checkbox
                                            label="Desejo receber novidades por email"
                                            checked={false}
                                            onChange={() => { }}
                                        />
                                        <Checkbox
                                            label="Opção desabilitada"
                                            checked={false}
                                            disabled
                                            onChange={() => { }}
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-radio"
                                    title="Radio"
                                    description="Botão de rádio para seleção única."
                                    code={`<Radio
  label="Opção 1"
  name="opcao"
  value="1"
  checked={radioValue === '1'}
  onChange={(e) => setRadioValue(e.target.value)}
/>`}
                                >
                                    <div className="space-y-3">
                                        <Radio
                                            label="Opção 1"
                                            name="opcao"
                                            value="1"
                                            checked={radioValue === '1'}
                                            onChange={(e) => setRadioValue(e.target.value)}
                                        />
                                        <Radio
                                            label="Opção 2"
                                            name="opcao"
                                            value="2"
                                            checked={radioValue === '2'}
                                            onChange={(e) => setRadioValue(e.target.value)}
                                        />
                                        <Radio
                                            label="Opção 3"
                                            name="opcao"
                                            value="3"
                                            checked={radioValue === '3'}
                                            onChange={(e) => setRadioValue(e.target.value)}
                                        />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="input-file"
                                    title="InputFile"
                                    description="Input para upload de arquivos."
                                    code={`<InputFile
  label="Upload de Arquivo"
  accept=".pdf,.doc,.docx"
  onChange={(e) => console.log(e.target.files)}
/>`}
                                >
                                    <div className="max-w-md">
                                        <InputFile
                                            label="Upload de Documento"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => console.log(e.target.files)}
                                        />
                                    </div>
                                </ComponentDemo>
                            </Section>
                        </>
                    )}

                    {/* Cards Section */}
                    {activeSection === 'cards' && (
                        <>
                            <Section title="🎴 Cards">
                                <ComponentDemo
                                    id="card-basic"
                                    title="Card Básico"
                                    description="Card genérico com título e ações."
                                    code={`<Card>
  <CardTitle>Título do Card</CardTitle>
  <p>Conteúdo do card aqui...</p>
  <CardActions>
    <Button buttonType="primary">Ação</Button>
  </CardActions>
</Card>`}
                                >
                                    <Card>
                                        <CardTitle>Título do Card</CardTitle>
                                        <p className="text-black my-4">
                                            Este é um card básico com título, conteúdo e área de ações.
                                            Pode ser usado para diversos propósitos.
                                        </p>
                                        <CardActions>
                                            <Button buttonType="primary" size="small">Ver Mais</Button>
                                            <Button buttonType="secondary" size="small" outline>Editar</Button>
                                        </CardActions>
                                    </Card>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="card-colors"
                                    title="Card com Variantes de Cor"
                                    description="Cards com diferentes cores para destacar informações."
                                    code={`<Card>
  <CardTitle color="primary">Primary Card</CardTitle>
  ...
</Card>

<Card>
  <CardTitle color="success">Success Card</CardTitle>
  ...
</Card>`}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card>
                                            <CardTitle color="primary">Informação</CardTitle>
                                            <p className="text-gray-600 text-sm my-2">Card com título azul</p>
                                        </Card>
                                        <Card>
                                            <CardTitle color="success">Sucesso</CardTitle>
                                            <p className="text-gray-600 text-sm my-2">Card com título verde</p>
                                        </Card>
                                        <Card>
                                            <CardTitle color="warning">Atenção</CardTitle>
                                            <p className="text-gray-600 text-sm my-2">Card com título laranja</p>
                                        </Card>
                                        <Card>
                                            <CardTitle color="danger">Erro</CardTitle>
                                            <p className="text-gray-600 text-sm my-2">Card com título vermelho</p>
                                        </Card>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="card-image"
                                    title="Card com Imagem"
                                    description="Card com imagem, título e conteúdo."
                                    code={`<Card>
  <CardImage 
    src="/images/default-user-no-image.jpg"
    alt="Exemplo"
    height={200}
  />
  <CardBody>
    <CardTitle>Card com Imagem</CardTitle>
    <p className="text-gray-600">
      Descrição do card com imagem
    </p>
  </CardBody>
  <CardActions align="right">
    <Button buttonType="primary" size="small">
      Ver Mais
    </Button>
  </CardActions>
</Card>`}
                                >
                                    <Card className="max-w-sm">
                                        <CardImage
                                            src="/images/default-user-no-image.jpg"
                                            alt="Perfil do Usuário"
                                            height={200}
                                        />
                                        <CardBody>
                                            <CardTitle>João Silva</CardTitle>
                                            <p className="text-gray-600 text-sm">
                                                Desenvolvedor Full Stack com 5 anos de experiência
                                            </p>
                                        </CardBody>
                                        <CardActions align="right">
                                            <Button buttonType="primary" size="small">Ver Perfil</Button>
                                        </CardActions>
                                    </Card>
                                </ComponentDemo>

                                <ComponentDemo
                                    title="Card com Badge na Imagem"
                                    description="Card com badge/título sobreposto na imagem."
                                    code={`<Card>
  <CardImage 
    src="/images/defult-no-image.png"
    alt="Projeto"
    height={200}
    title="Em Destaque"
  />
  <CardBody>
    <p>Conteúdo do card...</p>
  </CardBody>
</Card>`}
                                >
                                    <Card className="max-w-sm">
                                        <CardImage
                                            src="/images/defult-no-image.png"
                                            alt="Projeto"
                                            height={200}
                                            title="Em Destaque"
                                        />
                                        <CardBody>
                                            <p className="text-gray-600 text-sm py-2">
                                                Sistema de gestão empresarial completo desenvolvido com as mais modernas tecnologias.
                                            </p>
                                        </CardBody>
                                        <CardActions>
                                            <Button buttonType="success" size="small">Detalhes</Button>
                                            <Button buttonType="secondary" size="small" outline>Compartilhar</Button>
                                        </CardActions>
                                    </Card>
                                </ComponentDemo>

                                <ComponentDemo
                                    title="Card com Menu na Imagem"
                                    description="Card com botão de menu (3 pontos) na imagem."
                                    code={`<Card>
  <CardImage 
    src="/images/default-user-no-image.jpg"
    alt="Notícia"
    height={200}
    button
    onClick={() => alert('Menu clicado')}
  />
  <CardBody>
    <p>Conteúdo...</p>
  </CardBody>
</Card>`}
                                >
                                    <Card className="max-w-sm">
                                        <CardImage
                                            src="/images/default-user-no-image.jpg"
                                            alt="Notícia"
                                            height={200}
                                            button
                                            onClick={() => alert('Menu clicado')}
                                        />
                                        <CardBody>
                                            <p className="text-gray-600 text-sm py-2">
                                                Confira as últimas atualizações do sistema e novidades da plataforma.
                                            </p>
                                        </CardBody>
                                        <CardActions align="center">
                                            <Button buttonType="primary" size="small" block>Ler Mais</Button>
                                        </CardActions>
                                    </Card>
                                </ComponentDemo>

                            </Section>
                        </>
                    )}

                    {/* Layouts Section */}
                    {activeSection === 'layouts' && (
                        <>
                            <Section title="📐 Layouts">
                                {/* Typography */}
                                <ComponentDemo
                                    id="layout-typography"
                                    title="Typography - Componentes de Texto"
                                    description="Componentes para hierarquia de texto: Title, Subtitle, Label, Caption e FieldLabel"
                                    code={`import { Title, Subtitle, Label, Caption, FieldLabel } from '@/components/Layouts/Typography';

<Title>Título Principal</Title>
<Subtitle>Subtítulo</Subtitle>
<Label>Label Padrão</Label>
<Caption>Texto auxiliar</Caption>
<FieldLabel required>Campo Obrigatório</FieldLabel>`}
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <Title className="dark:text-gray-100">Título Principal</Title>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Componente: Title</p>
                                        </div>
                                        <div>
                                            <Subtitle className="dark:text-gray-200">Subtítulo do conteúdo</Subtitle>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Componente: Subtitle</p>
                                        </div>
                                        <div>
                                            <Label className="dark:text-gray-300">Label padrão</Label>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Componente: Label</p>
                                        </div>
                                        <div>
                                            <Caption className="dark:text-gray-400">Texto auxiliar em tamanho pequeno</Caption>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Componente: Caption</p>
                                        </div>
                                        <div>
                                            <FieldLabel required className="dark:text-gray-200">Campo Obrigatório</FieldLabel>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Componente: FieldLabel (com asterisco vermelho)</p>
                                        </div>
                                    </div>
                                </ComponentDemo>

                                {/* Accordion */}
                                <ComponentDemo
                                    id="layout-accordion"
                                    title="Accordion - Expansível Básico"
                                    description="Accordion com múltiplos itens expansíveis simultaneamente"
                                    code={`import Accordion from '@/components/Layouts/Accordion';

const items = [
  { title: 'Item 1', subTitle: 'Sub 1', content: '<p>Conteúdo 1</p>' },
  { title: 'Item 2', subTitle: 'Sub 2', content: '<p>Conteúdo 2</p>' }
];

<Accordion items={items} />`}
                                >
                                    <Accordion items={[
                                        { title: 'Item 1', subTitle: 'Subtítulo 1', content: '<p class="text-gray-700 dark:text-gray-300">Conteúdo do primeiro item do accordion</p>' },
                                        { title: 'Item 2', subTitle: 'Subtítulo 2', content: '<p class="text-gray-700 dark:text-gray-300">Conteúdo do segundo item do accordion</p>' },
                                        { title: 'Item 3', subTitle: 'Subtítulo 3', content: '<p class="text-gray-700 dark:text-gray-300">Conteúdo do terceiro item do accordion</p>' },
                                    ]} />
                                </ComponentDemo>

                                {/* Loading */}
                                <ComponentDemo
                                    id="layout-loading"
                                    title="Loading - Tela de Carregamento"
                                    description="Tela de loading com logo animado em 3D"
                                    code={`import Loading from '@/components/Layouts/Loading';

<Loading active={true} />`}
                                >
                                    <div className="relative h-64 bg-gray-100 dark:bg-gray-900 rounded">
                                        <Button onClick={() => setLoading(!loading)} className="mb-4">
                                            {loading ? 'Esconder Loading' : 'Mostrar Loading'}
                                        </Button>
                                        <Loading active={loading} />
                                        {!loading && (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                                Clique no botão para ativar
                                            </div>
                                        )}
                                    </div>
                                </ComponentDemo>

                                {/* NoDataFound */}
                                <ComponentDemo
                                    id="layout-nodata"
                                    title="NoDataFound - Sem Dados"
                                    description="Mensagem quando não há dados para exibir"
                                    code={`import NoDataFound from '@/components/Layouts/NoDataFound';

<NoDataFound visible={true} isLoading={false} />
<NoDataFound visible={true} isLoading={true} />`}
                                >
                                    <div className="space-y-4">
                                        <NoDataFound visible={true} isLoading={false} />
                                        <NoDataFound visible={true} isLoading={true} />
                                    </div>
                                </ComponentDemo>

                                {/* Pagination */}
                                <ComponentDemo
                                    id="layout-pagination"
                                    title="Pagination - Paginação"
                                    description="Paginação com controle de itens por página"
                                    code={`import { Pagination } from '@/components/Layouts/Pagination';

const data = Array.from({ length: 100 }, (_, i) => ({ 
  id: i + 1, 
  name: \`Item \${i + 1}\` 
}));

<Pagination 
  data={data}
  itemsPerPage={10}
  showPaginator={true}
  showItemCountSelector={true}
  size="md"
  callBackChangePage={(items) => console.log(items)}
/>`}
                                >
                                    <Pagination
                                        data={paginationData}
                                        itemsPerPage={10}
                                        showPaginator={true}
                                        showItemCountSelector={true}
                                        size="md"
                                        callBackChangePage={(items) => console.log('Página mudou:', items)}
                                    />
                                </ComponentDemo>

                                {/* Skeleton */}
                                <ComponentDemo
                                    id="layout-skeleton"
                                    title="Skeleton - Loader Básico"
                                    description="Skeleton loader animado genérico"
                                    code={`import Skeleton from '@/components/Layouts/Skeleton';

<Skeleton className="h-8 w-64" />
<Skeleton className="h-4 w-48" />
<Skeleton className="h-10 w-full" />`}
                                >
                                    <div className="space-y-4">
                                        <Skeleton className="h-8 w-64" />
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="layout-skeleton-form"
                                    title="FormSkeleton - Loader de Formulário"
                                    description="Skeleton especializado para formulários"
                                    code={`import { FormSkeleton } from '@/components/Layouts/Skeleton';

<FormSkeleton />`}
                                >
                                    <div className="h-96 overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                                        <FormSkeleton />
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="layout-skeleton-table"
                                    title="SkeletonList - Loader de Tabela"
                                    description="Skeleton para tabelas de dados"
                                    code={`import { SkeletonList } from '@/components/Layouts/Skeleton';

<SkeletonList count={5} variant="table" />`}
                                >
                                    <SkeletonList count={5} variant="table" />
                                </ComponentDemo>

                                <ComponentDemo
                                    id="layout-skeleton-card"
                                    title="SkeletonList - Loader de Cards"
                                    description="Skeleton para cards em grid"
                                    code={`import { SkeletonList } from '@/components/Layouts/Skeleton';

<SkeletonList count={3} variant="cards" />`}
                                >
                                    <SkeletonList count={3} variant="cards" />
                                </ComponentDemo>

                                <ComponentDemo
                                    id="layout-skeleton-list"
                                    title="SkeletonList - Loader de Lista"
                                    description="Skeleton para listas de itens"
                                    code={`import { SkeletonList } from '@/components/Layouts/Skeleton';

<SkeletonList count={5} variant="default" />`}
                                >
                                    <SkeletonList count={5} variant="default" />
                                </ComponentDemo>

                                {/* Tooltip */}
                                <ComponentDemo
                                    id="layout-tooltip"
                                    title="TooltipComponent - Dicas"
                                    description="Tooltip com múltiplas posições: top, bottom, left, right"
                                    code={`import { TooltipComponent } from '@/components/Layouts/TooltipComponent';

<TooltipComponent content="Texto do tooltip" side="top">
  <button>Hover aqui</button>
</TooltipComponent>`}
                                >
                                    <div className="flex gap-4 justify-center items-center flex-wrap">
                                        <TooltipComponent content="Tooltip no topo" side="top">
                                            <Button size="sm">Top</Button>
                                        </TooltipComponent>
                                        <TooltipComponent content="Tooltip embaixo" side="bottom">
                                            <Button size="sm">Bottom</Button>
                                        </TooltipComponent>
                                        <TooltipComponent content="Tooltip à esquerda" side="left">
                                            <Button size="sm">Left</Button>
                                        </TooltipComponent>
                                        <TooltipComponent content="Tooltip à direita" side="right">
                                            <Button size="sm">Right</Button>
                                        </TooltipComponent>
                                    </div>
                                </ComponentDemo>

                                {/* ModalGrid */}
                                <ComponentDemo
                                    id="layout-modal"
                                    title="ModalGrid - Modal Básico"
                                    description="Modal responsivo com tamanhos configuráveis (sm, md, lg, full)"
                                    code={`import ModalGrid from '@/components/Layouts/ModalGrid';

const [showModal, setShowModal] = useState(false);

<Button onClick={() => setShowModal(true)}>Abrir Modal</Button>

<ModalGrid
  modalControl={showModal}
  setModalControl={setShowModal}
  title="Título do Modal"
  size="md"
  btnCancel="Cancelar"
  btnSubmit="Salvar"
  submitCallBack={() => console.log('Salvo!')}
>
  <p>Conteúdo do modal aqui...</p>
</ModalGrid>`}
                                >
                                    <div className="space-y-4">
                                        <Button onClick={() => setShowModal(true)}>Abrir Modal Padrão</Button>
                                        
                                        <ModalGrid
                                            modalControl={showModal}
                                            setModalControl={setShowModal}
                                            title="Modal de Exemplo"
                                            size="md"
                                            btnCancel="Cancelar"
                                            btnSubmit="Salvar"
                                            submitCallBack={() => alert('Formulário salvo!')}
                                        >
                                            <div className="py-4 space-y-4">
                                                <p className="text-gray-700 dark:text-gray-300">
                                                    Este é um exemplo de conteúdo dentro do modal.
                                                </p>
                                                <InputText
                                                    label="Nome"
                                                    placeholder="Digite seu nome"
                                                />
                                                <InputEmail
                                                    label="E-mail"
                                                    placeholder="seu@email.com"
                                                />
                                            </div>
                                        </ModalGrid>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="layout-modal-variants"
                                    title="ModalGrid - Variantes de Cor"
                                    description="Modal com variantes danger (vermelho) e warning (laranja)"
                                    code={`// Modal de Perigo (danger)
<ModalGrid
  modalControl={showModal}
  setModalControl={setShowModal}
  title="Atenção!"
  danger
  btnCancel="Não"
  btnSubmit="Sim, excluir"
>
  <p>Tem certeza que deseja excluir?</p>
</ModalGrid>

// Modal de Aviso (warning)
<ModalGrid
  modalControl={showModal}
  setModalControl={setShowModal}
  title="Aviso"
  warning
  btnSubmit="Entendi"
>
  <p>Esta ação não pode ser desfeita.</p>
</ModalGrid>`}
                                >
                                    <div className="flex gap-4">
                                        <Button buttonType="danger" onClick={() => setShowModalDanger(true)}>
                                            Modal Danger
                                        </Button>
                                        <Button buttonType="warning" onClick={() => setShowModalWarning(true)}>
                                            Modal Warning
                                        </Button>

                                        <ModalGrid
                                            modalControl={showModalDanger}
                                            setModalControl={setShowModalDanger}
                                            title="Confirmar Exclusão"
                                            danger
                                            size="sm"
                                            btnCancel="Não"
                                            btnSubmit="Sim, excluir"
                                            submitCallBack={() => alert('Item excluído!')}
                                        >
                                            <div className="py-4">
                                                <p className="text-gray-700 dark:text-gray-300">
                                                    Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
                                                </p>
                                            </div>
                                        </ModalGrid>

                                        <ModalGrid
                                            modalControl={showModalWarning}
                                            setModalControl={setShowModalWarning}
                                            title="Aviso Importante"
                                            warning
                                            size="sm"
                                            btnSubmit="Entendi"
                                            submitCallBack={() => setShowModalWarning(false)}
                                        >
                                            <div className="py-4">
                                                <p className="text-gray-700 dark:text-gray-300">
                                                    As alterações realizadas podem afetar outros usuários do sistema.
                                                </p>
                                            </div>
                                        </ModalGrid>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="layout-modal-sizes"
                                    title="ModalGrid - Tamanhos"
                                    description="Diferentes tamanhos: sm (pequeno), md (médio), lg (grande), full (tela cheia)"
                                    code={`// Tamanhos disponíveis
<ModalGrid size="sm" /> // Pequeno
<ModalGrid size="md" /> // Médio (padrão)
<ModalGrid size="lg" /> // Grande
<ModalGrid size="full" /> // Tela cheia`}
                                >
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <strong>sm:</strong> 40-50% da tela em desktop<br/>
                                            <strong>md:</strong> 65-75% da tela em desktop<br/>
                                            <strong>lg:</strong> 80-85% da tela em desktop<br/>
                                            <strong>full:</strong> 100% da tela (tela cheia)
                                        </p>
                                    </div>
                                </ComponentDemo>

                                <ComponentDemo
                                    id="layout-modal-props"
                                    title="ModalGrid - Propriedades"
                                    description="Props disponíveis para personalização"
                                    code={`<ModalGrid
  modalControl={boolean}           // Controla visibilidade
  setModalControl={function}       // Função para alterar visibilidade
  title={string}                   // Título do modal
  size="sm|md|lg|full"            // Tamanho (default: md)
  danger={boolean}                 // Estilo vermelho
  warning={boolean}                // Estilo laranja
  dismissible={boolean}            // Fecha com ESC (default: true)
  scrollable={boolean}             // Conteúdo com scroll (default: true)
  scrollableX={boolean}            // Scroll horizontal
  btnCancel={string}               // Texto botão cancelar
  btnSubmit={string}               // Texto botão submit
  submitCallBack={function}        // Função ao clicar em submit
  closeOnSubmit={boolean}          // Fecha ao submeter
  closeModalCallback={function}    // Callback ao fechar
  footer={ReactNode}               // Footer customizado
  footerClass={string}             // Classes CSS do footer
  contentClass={string}            // Classes CSS do conteúdo
  background={string}              // Background customizado
  height={string}                  // Altura customizada
  width={string}                   // Largura customizada
  customMargin={string}            // Margem customizada
/>`}
                                >
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <p>Veja o código ao lado para todas as propriedades disponíveis.</p>
                                    </div>
                                </ComponentDemo>

                                {/* Balloon */}
                                <ComponentDemo
                                    id="layout-balloon"
                                    title="Balloon - Balão de Notificação"
                                    description="Balão animado com seta para destacar elementos (top, bottom, left, right)"
                                    code={`import Balloon from '@/components/Layouts/Balloon';

const [show, setShow] = useState(true);

<div className="relative">
  <Button>Elemento</Button>
  <Balloon 
    visible={show} 
    placement="top" 
    color="primary"
  >
    Nova notificação!
  </Balloon>
</div>

// Cores: primary, warning, danger, success, dark, default
// Posições: top, bottom, left, right`}
                                >
                                    <div className="flex gap-4 justify-center items-center flex-wrap">
                                        <div className="relative">
                                            <Button size="sm">Primary Top</Button>
                                            <Balloon visible={showBalloon} placement="top" color="primary">
                                                Novo!
                                            </Balloon>
                                        </div>
                                        <div className="relative">
                                            <Button size="sm">Warning Bottom</Button>
                                            <Balloon visible={showBalloon} placement="bottom" color="warning">
                                                Atenção!
                                            </Balloon>
                                        </div>
                                        <div className="relative">
                                            <Button size="sm">Danger Right</Button>
                                            <Balloon visible={showBalloon} placement="right" color="danger">
                                                Erro!
                                            </Balloon>
                                        </div>
                                        <div className="relative">
                                            <Button size="sm">Success Left</Button>
                                            <Balloon visible={showBalloon} placement="left" color="success">
                                                OK!
                                            </Balloon>
                                        </div>
                                        <Button size="sm" onClick={() => setShowBalloon(!showBalloon)}>
                                            {showBalloon ? 'Esconder' : 'Mostrar'} Balões
                                        </Button>
                                    </div>
                                </ComponentDemo>

                                {/* Blockquote */}
                                <ComponentDemo
                                    id="layout-blockquote"
                                    title="Blockquote - Citação Destacada"
                                    description="Bloco de citação com cores e tamanhos (danger, success, warning, primary, default)"
                                    code={`import Blockquote from '@/components/Layouts/Blockquote';

<Blockquote type="primary" size="md">
  Informação importante aqui
</Blockquote>

<Blockquote type="danger" size="sm">
  Mensagem de erro
</Blockquote>

// Tipos: danger, success, warning, primary, default
// Tamanhos: xs, sm, md, lg`}
                                >
                                    <div className="space-y-4">
                                        <Blockquote type="primary" size="sm">
                                            💡 Esta é uma informação importante do sistema.
                                        </Blockquote>
                                        <Blockquote type="success" size="sm">
                                            ✓ Operação realizada com sucesso!
                                        </Blockquote>
                                        <Blockquote type="warning" size="sm">
                                            ⚠️ Atenção: verifique os dados antes de continuar.
                                        </Blockquote>
                                        <Blockquote type="danger" size="sm">
                                            ✕ Erro ao processar a solicitação.
                                        </Blockquote>
                                        <Blockquote type="default" size="md">
                                            Citação padrão com texto maior para destaque de conteúdo importante.
                                        </Blockquote>
                                    </div>
                                </ComponentDemo>

                                {/* Clipboard */}
                                <ComponentDemo
                                    id="layout-clipboard"
                                    title="Clipboard - Copiar Texto"
                                    description="Componente para copiar texto para área de transferência"
                                    code={`import Clipboard from '@/components/Layouts/Clipboard';

<Clipboard textToStore="Texto a ser copiado">
  Clique no ícone para copiar
</Clipboard>

// Com texto diferente do exibido
<Clipboard textToStore="texto-secreto-123">
  Código: XXXX-XXXX
</Clipboard>`}
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Clipboard>
                                                usuario@email.com
                                            </Clipboard>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Clipboard textToStore="ABC123XYZ789">
                                                Código: ABC123XYZ789
                                            </Clipboard>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Clipboard textToStore="https://exemplo.com/api/v1/endpoint" className="text-primary">
                                                https://exemplo.com/api/v1/endpoint
                                            </Clipboard>
                                        </div>
                                    </div>
                                </ComponentDemo>

                                {/* Confirm */}
                                <ComponentDemo
                                    id="layout-confirm"
                                    title="Confirm - Confirmação Simples"
                                    description="Modal de confirmação com ícone de alerta"
                                    code={`import Confirm from '@/components/Layouts/Confirm';

const [show, setShow] = useState(false);

<Button onClick={() => setShow(true)}>Excluir</Button>

<Confirm
  visible={show}
  setVisible={setShow}
  primaryText="Confirmar exclusão?"
  secondaryText="Esta ação não pode ser desfeita"
  btnAccept="Sim, excluir"
  btnDecline="Cancelar"
  confirmActionCallback={() => console.log('Confirmado!')}
  cancelActionCallback={() => console.log('Cancelado')}
/>`}
                                >
                                    <div>
                                        <Button buttonType="danger" onClick={() => setShowConfirm(true)}>
                                            Abrir Confirm
                                        </Button>
                                        <Confirm
                                            visible={showConfirm}
                                            setVisible={setShowConfirm}
                                            primaryText="Deseja realmente continuar?"
                                            secondaryText="Esta ação pode afetar outros registros"
                                            btnAccept="Sim, continuar"
                                            btnDecline="Não, cancelar"
                                            confirmActionCallback={() => alert('Ação confirmada!')}
                                        />
                                    </div>
                                </ComponentDemo>

                                {/* Dialog */}
                                <ComponentDemo
                                    id="layout-dialog"
                                    title="Dialog - Diálogo com Textarea"
                                    description="Modal com textarea para entrada de texto (útil para justificativas)"
                                    code={`import Dialog from '@/components/Layouts/Dialog';

const [show, setShow] = useState(false);

<Dialog
  showDialog={show}
  setDialogControl={setShow}
  title="Motivo da Rejeição"
  textAreaLabel="Descreva o motivo"
  textAreaMinLength={10}
  maxLength={200}
  btnCancel="Cancelar"
  btnAccept="Enviar"
  confirmActionCallback={(text) => console.log(text)}
/>`}
                                >
                                    <div>
                                        <Button onClick={() => setShowDialog(true)}>
                                            Abrir Dialog
                                        </Button>
                                        <Dialog
                                            showDialog={showDialog}
                                            setDialogControl={setShowDialog}
                                            title="Justificativa"
                                            textAreaLabel="Motivo"
                                            textAreaMinLength={10}
                                            maxLength={200}
                                            btnCancel="Cancelar"
                                            btnAccept="Enviar"
                                            confirmActionCallback={(text) => alert(`Texto: ${text}`)}
                                        />
                                    </div>
                                </ComponentDemo>

                                {/* DialogFields */}
                                <ComponentDemo
                                    id="layout-dialogfields"
                                    title="DialogFields - Diálogo com Campos"
                                    description="Modal para formulários rápidos com campos customizados"
                                    code={`import DialogFields from '@/components/Layouts/DialogFields';

const [show, setShow] = useState(false);

<DialogFields
  visible={show}
  title="Editar Dados"
  type="primary"
  labelConfirm="Salvar"
  onCancel={() => setShow(false)}
  onSave={() => console.log('Salvando...')}
>
  <InputText label="Nome" />
  <InputEmail label="E-mail" />
</DialogFields>`}
                                >
                                    <div>
                                        <Button onClick={() => setShowDialogFields(true)}>
                                            Abrir DialogFields
                                        </Button>
                                        <DialogFields
                                            visible={showDialogFields}
                                            title="Cadastro Rápido"
                                            type="success"
                                            labelConfirm="Cadastrar"
                                            onCancel={() => setShowDialogFields(false)}
                                            onSave={() => {
                                                alert('Cadastrado!');
                                                setShowDialogFields(false);
                                            }}
                                        >
                                            <InputText label="Nome Completo" placeholder="Digite seu nome" />
                                            <InputEmail label="E-mail" placeholder="seu@email.com" />
                                        </DialogFields>
                                    </div>
                                </ComponentDemo>

                                {/* DataLoading */}
                                <ComponentDemo
                                    id="layout-dataloading"
                                    title="DataLoading - Carregando com Pontos"
                                    description="Indicador de loading com texto e pontos animados"
                                    code={`import DataLoading from '@/components/Layouts/DataLoading';

<DataLoading />
<DataLoading className="text-primary" />`}
                                >
                                    <div className="space-y-4">
                                        <DataLoading />
                                        <DataLoading className="text-primary" />
                                    </div>
                                </ComponentDemo>

                                {/* Failure */}
                                <ComponentDemo
                                    id="layout-failure"
                                    title="Failure - Tela de Erro"
                                    description="Tela de falha com ícone e mensagem customizável"
                                    code={`import Failure from '@/components/Layouts/Failure';

<Failure 
  active={true} 
  message="Erro ao carregar dados"
/>`}
                                >
                                    <div className="relative h-64 bg-gray-100 dark:bg-gray-900 rounded">
                                        <Button onClick={() => setShowFailure(!showFailure)} className="mb-4">
                                            {showFailure ? 'Esconder' : 'Mostrar'} Failure
                                        </Button>
                                        <Failure active={showFailure} message="Não foi possível carregar os dados. Tente novamente." />
                                    </div>
                                </ComponentDemo>

                                {/* Iframe */}
                                <ComponentDemo
                                    id="layout-iframe"
                                    title="Iframe - Frame Incorporado"
                                    description="Componente para incorporar páginas com loading e callback"
                                    code={`import Iframe from '@/components/Layouts/Iframe';

<Iframe
  id="my-iframe"
  src="pagina.html"
  title="Página Externa"
  visible={true}
  active={true}
  params={{ token: 'abc123' }}
  callback={(type, payload) => {
    console.log('Mensagem do iframe:', type, payload);
  }}
/>`}
                                >
                                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                        <p><strong>Props:</strong></p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li><code>src</code> - URL da página</li>
                                            <li><code>params</code> - Parâmetros de query string</li>
                                            <li><code>callback</code> - Função para receber mensagens do iframe</li>
                                            <li><code>visible/active</code> - Controle de visibilidade</li>
                                        </ul>
                                    </div>
                                </ComponentDemo>

                                {/* MiniSidebar */}
                                <ComponentDemo
                                    id="layout-minisidebar"
                                    title="MiniSidebar - Barra Lateral Compacta"
                                    description="Sidebar responsiva com ícones e labels (vertical ou horizontal)"
                                    code={`import MiniSidebar from '@/components/Layouts/MiniSidebar';
import { faHome, faUser, faCog } from '@fortawesome/free-solid-svg-icons';

const [active, setActive] = useState('home');

const items = [
  { id: 'home', label: 'Início', icon: faHome },
  { id: 'profile', label: 'Perfil', icon: faUser },
  { id: 'settings', label: 'Configurações', icon: faCog }
];

<MiniSidebar
  items={items}
  filtroAtivo={active}
  onItemClick={(id) => setActive(id)}
  horizontal={false}
  responsiveLabel={true}
/>`}
                                >
                                    <div className="space-y-4">
                                        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded">
                                            <p className="text-sm mb-2 font-semibold">Vertical:</p>
                                            <MiniSidebar
                                                items={[
                                                    { id: 'home', label: 'Início', icon: faHome },
                                                    { id: 'profile', label: 'Perfil', icon: faUser },
                                                    { id: 'settings', label: 'Configurações', icon: faCog },
                                                    { id: 'stats', label: 'Estatísticas', icon: faChartBar }
                                                ]}
                                                filtroAtivo={sidebarActive}
                                                onItemClick={(id) => setSidebarActive(id)}
                                                horizontal={false}
                                                responsiveLabel={false}
                                            />
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded">
                                            <p className="text-sm mb-2 font-semibold">Horizontal:</p>
                                            <MiniSidebar
                                                items={[
                                                    { id: 'home', label: 'Início', icon: faHome },
                                                    { id: 'profile', label: 'Perfil', icon: faUser },
                                                    { id: 'settings', label: 'Configurações', icon: faCog },
                                                    { id: 'stats', label: 'Estatísticas', icon: faChartBar }
                                                ]}
                                                filtroAtivo={sidebarActive}
                                                onItemClick={(id) => setSidebarActive(id)}
                                                horizontal={true}
                                                responsiveLabel={false}
                                            />
                                        </div>
                                    </div>
                                </ComponentDemo>
                            </Section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
