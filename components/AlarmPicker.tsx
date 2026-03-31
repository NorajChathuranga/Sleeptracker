import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { Colors } from '../constants/colors';

type Props = {
	enabled: boolean;
	timeHHMM: string;
	onToggle: (value: boolean) => void;
	onChangeTime: (value: string) => void;
	disabled?: boolean;
};

function parseHHMM(value: string): Date {
	const [hRaw, mRaw] = value.split(':').map(Number);
	const hour = Number.isFinite(hRaw) ? Math.min(Math.max(hRaw, 0), 23) : 6;
	const minute = Number.isFinite(mRaw) ? Math.min(Math.max(mRaw, 0), 59) : 30;

	const date = new Date();
	date.setHours(hour, minute, 0, 0);
	return date;
}

function toHHMM(date: Date): string {
	const hour = String(date.getHours()).padStart(2, '0');
	const minute = String(date.getMinutes()).padStart(2, '0');
	return `${hour}:${minute}`;
}

export function AlarmPicker({
	enabled,
	timeHHMM,
	onToggle,
	onChangeTime,
	disabled = false,
}: Props): React.JSX.Element {
	const [showPicker, setShowPicker] = useState(false);

	const selectedDate = useMemo(() => parseHHMM(timeHHMM), [timeHHMM]);
	const formatted = useMemo(() => format(selectedDate, 'hh:mm a'), [selectedDate]);

	const onPickerChange = (event: DateTimePickerEvent, value?: Date): void => {
		if (Platform.OS === 'android') {
			setShowPicker(false);
		}

		if (event.type === 'dismissed' || !value) return;
		onChangeTime(toHHMM(value));
	};

	return (
		<View style={[styles.card, disabled && styles.cardDisabled]}>
			<View style={styles.topRow}>
				<View style={styles.textWrap}>
					<Text style={styles.title}>Wake Alarm</Text>
					<Text style={styles.subtitle}>{formatted}</Text>
				</View>
				<Switch
					value={enabled}
					onValueChange={onToggle}
					disabled={disabled}
					trackColor={{ false: Colors.border, true: Colors.primary }}
					thumbColor={Colors.textPrimary}
				/>
			</View>

			<Pressable
				style={[styles.editButton, (!enabled || disabled) && styles.editButtonDisabled]}
				onPress={() => setShowPicker((v) => !v)}
				disabled={!enabled || disabled}
			>
				<Text style={styles.editButtonText}>Set alarm time</Text>
			</Pressable>

			{showPicker ? (
				<View style={styles.pickerWrap}>
					<DateTimePicker
						value={selectedDate}
						mode="time"
						display={Platform.OS === 'ios' ? 'spinner' : 'default'}
						is24Hour={false}
						onChange={onPickerChange}
					/>
					{Platform.OS === 'ios' ? (
						<Pressable style={styles.doneBtn} onPress={() => setShowPicker(false)}>
							<Text style={styles.doneBtnText}>Done</Text>
						</Pressable>
					) : null}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: 14,
		gap: 12,
	},
	cardDisabled: {
		opacity: 0.7,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	textWrap: {
		gap: 2,
	},
	title: {
		color: Colors.textPrimary,
		fontSize: 16,
		fontWeight: '700',
	},
	subtitle: {
		color: Colors.textSecondary,
		fontSize: 14,
	},
	editButton: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surfaceAlt,
		alignItems: 'center',
		paddingVertical: 10,
	},
	editButtonDisabled: {
		opacity: 0.6,
	},
	editButtonText: {
		color: Colors.primaryLight,
		fontWeight: '700',
	},
	pickerWrap: {
		borderTopWidth: 1,
		borderTopColor: Colors.border,
		paddingTop: 8,
	},
	doneBtn: {
		marginTop: 6,
		alignSelf: 'flex-end',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: Colors.primary,
	},
	doneBtnText: {
		color: Colors.textPrimary,
		fontWeight: '700',
	},
});

