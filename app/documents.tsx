import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { compareConfirmedDocumentFields, documentsForProfile } from '@/lib/documents';
import { useAppStore } from '@/store/useAppStore';
import { colors, webDepth } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MAX_DOCUMENT_BYTES, normalizedDocumentMime, uploadPrivateDocument } from '@/lib/cloudDocuments';

const webLocalUrl = (file?: File | null) => file && Platform.OS === 'web' ? URL.createObjectURL(file) : undefined;

export default function DocumentsScreen() {
  const router = useRouter();
  const { demoSession } = useAuth();
  const { documents, profiles, activeProfileId, addDocument, updateDocument, profileNames, consentPreferences } = useAppStore();
  const docs = documentsForProfile(documents, activeProfileId);
  const profileName = profileNames[activeProfileId] || profiles.find((profile) => profile.id === activeProfileId)?.name || 'Familia';
  const comparisons = compareConfirmedDocumentFields(documents, activeProfileId);
  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.size || asset.size > MAX_DOCUMENT_BYTES) { Alert.alert('Archivo no admitido', 'Utiliza un PDF o imagen de hasta 8 MB cuyo tamaño pueda comprobarse.'); return; }
    const mimeType = normalizedDocumentMime(asset.name, asset.mimeType);
    if (!mimeType) { Alert.alert('Formato no admitido', 'Puedes cargar PDF, JPG, PNG, WebP, HEIC o HEIF.'); return; }
    const now = new Date();
    const localUri = demoSession ? webLocalUrl(asset.file) || asset.uri : undefined;
    const id = addDocument({ name: asset.name, category: 'Pendiente de clasificar', date: now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }), occurredAt: now.toISOString(), status: 'pending', analysisStatus: 'idle', extracted: [], extractedFields: [], uri: localUri, mimeType, sizeBytes: asset.size, localOnly: demoSession, uploadStatus: demoSession ? 'local' : 'uploading' });
    if (!demoSession) {
      try {
        const bytes = asset.file ? await asset.file.arrayBuffer() : await fetch(asset.uri).then((response) => {
          if (!response.ok) throw new Error('file unavailable'); return response.arrayBuffer();
        });
        const uploaded = await uploadPrivateDocument({ profileId: activeProfileId, clientId: id, name: asset.name, mimeType, sizeBytes: asset.size, category: 'Pendiente de clasificar', occurredAt: now.toISOString(), bytes });
        updateDocument(id, { ...uploaded, localOnly: false, uploadStatus: 'uploaded' });
      } catch {
        updateDocument(id, { uploadStatus: 'failed' });
        Alert.alert('No se completó la carga', 'El archivo no salió del dispositivo o fue retirado del almacenamiento si la transferencia falló. Puedes eliminar esta entrada e intentarlo nuevamente.');
      }
    }
    if (Platform.OS === 'web') router.push({ pathname: '/document/[id]', params: { id } });
    else Alert.alert('Documento guardado', `Se agregó al expediente de ${profileName}. Puedes conservarlo sin análisis y anotar sólo los datos que necesites.`, [{ text: 'Ver documento', onPress: () => router.push({ pathname: '/document/[id]', params: { id } }) }, { text: 'Continuar' }]);
  };
  return <AppShell><ProfileHeader eyebrow="EXPEDIENTE FAMILIAR" />
    <Text style={styles.title}>Documentos de {profileName}</Text><Text style={styles.subtitle}>Informes, laboratorios, ultrasonidos y cartillas separados por perfil.</Text>
    <Pressable style={styles.upload} onPress={pick}><View style={styles.uploadIcon}><MaterialCommunityIcons name="file-plus-outline" size={28} color={colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={styles.uploadTitle}>Guardar PDF o imagen</Text><Text style={styles.uploadSub}>Puedes archivarlo y anotar datos importantes sin usar IA</Text></View><MaterialCommunityIcons name="plus" size={22} color={colors.sageDark} /></Pressable>
    <View style={styles.safety}><MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.sageDark} /><Text style={styles.safetyText}>{demoSession ? 'El expediente es local y gratuito. Conserva una copia del original porque puede perderse al borrar la app o el navegador.' : 'Los archivos se guardan en un espacio privado y se abren mediante vínculos temporales.'} Análisis documental: {consentPreferences.documentAnalysis ? 'autorizado' : 'sin autorización'}.</Text></View>
    <SectionTitle title="Expediente" action={`${docs.length} archivos`} />
    {docs.map((doc) => <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/document/[id]', params: { id: doc.id } })} key={doc.id} style={styles.doc}><View style={styles.fileIcon}><MaterialCommunityIcons name={doc.name.endsWith('.pdf') ? 'file-pdf-box' : 'file-image-outline'} size={25} color={doc.name.endsWith('.pdf') ? '#B55C56' : colors.sageDark} /></View><View style={{ flex: 1 }}><Text style={styles.docName} numberOfLines={1}>{doc.name}</Text><Text style={styles.docMeta}>{doc.category} · {doc.date}</Text><View style={[styles.status, (doc.status === 'pending' || doc.uploadStatus === 'failed') && styles.statusPending]}><Text style={[styles.statusText, (doc.status === 'pending' || doc.uploadStatus === 'failed') && styles.statusTextPending]}>{doc.uploadStatus === 'uploading' ? '↑ Protegiendo archivo…' : doc.uploadStatus === 'failed' ? '! Carga incompleta' : doc.status === 'reviewed' ? '✓ Datos confirmados' : '◷ Revisión pendiente'}</Text></View>{doc.extracted.length > 0 && <View style={styles.extracted}>{doc.extracted.map((item) => <Text key={item} style={styles.extractedText}>• {item}</Text>)}</View>}</View><MaterialCommunityIcons name="chevron-right" size={21} color={colors.muted} /></Pressable>)}
    {!docs.length ? <View style={styles.empty}><MaterialCommunityIcons name="folder-outline" size={28} color={colors.muted} /><Text style={styles.emptyTitle}>Este perfil aún no tiene documentos</Text><Text style={styles.emptyBody}>Carga un PDF o una imagen para comenzar su expediente.</Text></View> : null}
    {comparisons.length ? <><SectionTitle title="Cambios entre documentos" /><View style={styles.comparisons}>{comparisons.map((item) => <View key={`${item.fieldLabel}-${item.currentDocument}`} style={styles.comparison}><MaterialCommunityIcons name="compare-horizontal" size={19} color="#65547F" /><View style={{ flex: 1 }}><Text style={styles.comparisonTitle}>{item.fieldLabel}</Text><Text style={styles.comparisonBody}>{item.statement}</Text><Text style={styles.comparisonSource}>{item.previousDocument} → {item.currentDocument}</Text></View></View>)}<Text style={styles.comparisonFoot}>Comparación documental. No indica normalidad, causa ni diagnóstico.</Text></View></> : null}
    <SectionTitle title="Análisis opcional" /><View style={styles.aiCard}><Text style={styles.aiTitle}>Guardar es independiente de analizar</Text><Text style={styles.aiBody}>Puedes conservar el archivo y escribir datos importantes sin IA. Si algún día autorizas extracción automática, Emi sólo propondrá campos para que tú los revises; nunca diagnosticará.</Text></View>
  </AppShell>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 27, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, upload: { marginTop: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.sage, borderRadius: 24, backgroundColor: 'rgba(239,245,241,.9)', padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12, ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, uploadIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: 'rgba(255,255,255,.76)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: webDepth.control } as any }) }, uploadTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, uploadSub: { color: colors.muted, fontSize: 9, marginTop: 3 }, safety: { flexDirection: 'row', gap: 8, marginTop: 10, paddingHorizontal: 7, alignItems: 'center' }, safetyText: { color: colors.muted, fontSize: 9, flex: 1 }, doc: { backgroundColor: 'rgba(255,253,252,.92)', borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 14, flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start', ...Platform.select({ web: { boxShadow: webDepth.soft } as any }) }, fileIcon: { width: 43, height: 48, backgroundColor: colors.canvas, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, docName: { color: colors.ink, fontSize: 12, fontWeight: '800' }, docMeta: { color: colors.muted, fontSize: 9, marginTop: 3 }, status: { alignSelf: 'flex-start', marginTop: 7, backgroundColor: colors.mint, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }, statusPending: { backgroundColor: '#FFF1D8' }, statusText: { color: colors.sageDark, fontSize: 8, fontWeight: '800' }, statusTextPending: { color: '#8C6724' }, extracted: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 7 }, extractedText: { color: colors.muted, fontSize: 9, lineHeight: 15 }, comparisons: { backgroundColor: colors.lilac, borderRadius: 20, padding: 14 }, comparison: { flexDirection: 'row', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#D9D1E6' }, comparisonTitle: { color: '#514669', fontSize: 10, fontWeight: '900' }, comparisonBody: { color: '#6F6581', fontSize: 9, lineHeight: 14, marginTop: 3 }, comparisonSource: { color: '#7B718B', fontSize: 7, marginTop: 4 }, comparisonFoot: { color: '#65547F', fontSize: 8, fontWeight: '700', marginTop: 9 }, empty: { alignItems: 'center', padding: 22, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }, emptyTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 8 }, emptyBody: { color: colors.muted, fontSize: 9, marginTop: 3 }, aiCard: { backgroundColor: colors.lilac, borderRadius: 20, padding: 17 }, aiTitle: { color: '#514669', fontWeight: '800', fontSize: 13 }, aiBody: { color: '#6F6581', fontSize: 10, lineHeight: 16, marginTop: 5 }
});
